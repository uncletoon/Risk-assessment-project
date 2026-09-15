const { pool } = require('../config/db');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { validateDocumentPII, predictRiskWithCustomRules } = require('../services/geminiService');

function extractFileContent(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      const altPath = path.resolve(__dirname, '../../', filePath);
      if (fs.existsSync(altPath)) {
        filePath = altPath;
      } else {
        return '';
      }
    }
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.csv' || ext === '.txt' || ext === '.json') {
      return fs.readFileSync(filePath, 'utf-8');
    }
    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return xlsx.utils.sheet_to_csv(sheet);
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error('Error reading file content:', err);
    return '';
  }
}

/**
 * 1. Validate file for PII using Gemini AI
 */
const validatePII = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded for privacy validation' });
    }

    const content = extractFileContent(req.file.path);
    if (!content) {
      return res.status(400).json({ message: 'Could not extract readable text from the uploaded file' });
    }

    const piiResult = await validateDocumentPII(content);

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      tempPath: req.file.path,
      ...piiResult,
    });
  } catch (error) {
    console.error('validatePII error:', error);
    res.status(500).json({ message: 'Error scanning file for PII', error: error.message });
  }
};

/**
 * 2. Employee submits incident & supporting document to PostgreSQL
 */
const submitIncident = async (req, res) => {
  try {
    const { title, category, description, piiClean, tempPath } = req.body;
    let filename = req.file ? req.file.filename : (tempPath ? path.basename(tempPath) : 'supporting_evidence.csv');
    let filePath = req.file ? req.file.path : (tempPath || '');

    const submittedById = req.user?.id || null;
    const submittedByName = req.user?.full_name ? `${req.user.full_name} (${req.user.role || 'Officer'})` : 'Loan Officer';

    const result = await pool.query(
      `INSERT INTO risk_submissions (
        title, category, description, filename, file_path, pii_clean, submitted_by_id, submitted_by_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        title || 'Loan Activity Risk Assessment',
        category || 'operational',
        description || 'Suspicious risk profile flagged by loan officer.',
        filename,
        filePath,
        piiClean === 'true' || piiClean === true,
        submittedById,
        submittedByName,
        'PENDING_REVIEW'
      ]
    );

    res.status(201).json({
      message: 'Risk report submitted successfully to database queue.',
      submission: result.rows[0],
    });
  } catch (error) {
    console.error('submitIncident DB error:', error);
    res.status(500).json({ message: 'Failed to record submission into database', error: error.message });
  }
};

/**
 * 3. Fetch all submissions from PostgreSQL
 */
const getSubmissions = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM risk_submissions ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getSubmissions DB error:', error);
    res.status(500).json({ message: 'Error fetching submissions from database' });
  }
};

/**
 * 3b. Fetch single submission by ID with AI prediction
 */
const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM risk_submissions WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('getSubmissionById error:', error);
    res.status(500).json({ message: 'Error fetching submission details' });
  }
};

/**
 * 3c. Fetch Employee's personal reported submissions & Officer feedback
 */
const getEmployeeSubmissions = async (req, res) => {
  try {
    let query = 'SELECT * FROM risk_submissions ORDER BY created_at DESC';
    let params = [];

    if (req.user && req.user.id) {
      query = 'SELECT * FROM risk_submissions WHERE submitted_by_id = $1 OR submitted_by_name ILIKE $2 ORDER BY created_at DESC';
      params = [req.user.id, `%${req.user.full_name}%`];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('getEmployeeSubmissions error:', error);
    res.status(500).json({ message: 'Failed to load employee reports from database' });
  }
};

/**
 * 4. Risk Officer executes Gemini AI prediction with Custom Rules
 */
const runPrediction = async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const { customRules } = req.body;

    const subRes = await pool.query('SELECT * FROM risk_submissions WHERE id = $1', [submissionId]);
    if (subRes.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found in database' });
    }

    const submission = subRes.rows[0];

    // Extract file content
    let fileContent = extractFileContent(submission.file_path);
    if (!fileContent) {
      const defaultTestData = path.resolve(__dirname, '../../test_data/loan_portfolio_history.csv');
      fileContent = extractFileContent(defaultTestData);
    }

    // Call Gemini AI
    const predictionResult = await predictRiskWithCustomRules(
      fileContent,
      customRules,
      submission.description
    );

    // Save prediction to PostgreSQL
    const updateRes = await pool.query(
      `UPDATE risk_submissions 
       SET ai_prediction = $1, custom_rules_applied = $2 
       WHERE id = $3 
       RETURNING *`,
      [JSON.stringify(predictionResult.analysis), customRules, submissionId]
    );

    res.json({
      message: 'AI Risk Prediction complete and saved to database',
      submissionId,
      prediction: predictionResult.analysis,
      submission: updateRes.rows[0],
    });
  } catch (error) {
    console.error('runPrediction error:', error);
    res.status(500).json({ message: 'Failed to run AI prediction', error: error.message });
  }
};

/**
 * 5. Risk Officer confirms, rejects, or archives submission in PostgreSQL
 */
const decideSubmission = async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    const { decision, notes, selectedRecommendations } = req.body; // 'CONFIRMED', 'REJECTED', or 'ARCHIVED'
    const decidedBy = req.user?.full_name || 'Risk Officer';

    let storedNotes = notes;
    if (selectedRecommendations && Array.isArray(selectedRecommendations)) {
      storedNotes = JSON.stringify({
        officer_notes: notes || '',
        selected_recommendations: selectedRecommendations,
      });
    }

    let updateRes;
    if (decision === 'ARCHIVED') {
      updateRes = await pool.query(
        `UPDATE risk_submissions
         SET status = 'ARCHIVED'
         WHERE id = $1
         RETURNING *`,
        [submissionId]
      );
    } else {
      updateRes = await pool.query(
        `UPDATE risk_submissions
         SET status = $1, decision_notes = $2, decided_by = $3, decided_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [decision, storedNotes, decidedBy, submissionId]
      );
    }

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    const submission = updateRes.rows[0];

    // If confirmed, insert into risk_assessments table
    if (decision === 'CONFIRMED' && submission.ai_prediction) {
      const pred = typeof submission.ai_prediction === 'string' ? JSON.parse(submission.ai_prediction) : submission.ai_prediction;
      
      await pool.query(
        `INSERT INTO risk_assessments (
          submission_id, borrower_id, borrower_name, loan_amount, loan_purpose, risk_score, risk_level, default_probability, recommendation, ai_explanation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          submission.id,
          `SUB-${submission.id}`,
          submission.title,
          3500000.00,
          submission.category.toUpperCase(),
          pred.eri_score || 70,
          pred.risk_level || 'High',
          Math.round((pred.eri_score || 70) * 0.35 * 10) / 10,
          notes || pred.decision || 'Approve with Conditions',
          pred.one_year_projection || 'Assessment confirmed by Risk Officer using custom rules.'
        ]
      );
    }

    res.json({
      message: `Submission ${decision.toLowerCase()} successfully`,
      submission,
    });
  } catch (error) {
    console.error('decideSubmission error:', error);
    res.status(500).json({ message: 'Failed to record decision into database', error: error.message });
  }
};

/**
 * 6. Get confirmed assessments from PostgreSQL
 */
const getAssessments = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM risk_assessments ORDER BY assessment_date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('getAssessments DB error:', error);
    res.status(500).json({ message: 'Error retrieving risk assessments from database' });
  }
};

/**
 * 7. Get dashboard aggregated metrics from PostgreSQL
 */
const getDashboardStats = async (req, res) => {
  try {
    const [subStats, assStats, recentSubs] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) AS total_submissions,
          COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW') AS pending_reviews,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed_submissions
        FROM risk_submissions
      `),
      pool.query(`
        SELECT 
          COUNT(*) AS total_assessments,
          COALESCE(SUM(loan_amount), 0) AS total_exposure_rwf,
          COALESCE(AVG(risk_score), 0) AS avg_risk_score,
          COUNT(*) FILTER (WHERE risk_level = 'High' OR risk_level = 'Critical') AS high_risk_count
        FROM risk_assessments
      `),
      pool.query(`
        SELECT * FROM risk_submissions ORDER BY created_at DESC LIMIT 5
      `),
    ]);

    res.json({
      submissions: subStats.rows[0],
      assessments: assStats.rows[0],
      recentSubmissions: recentSubs.rows,
    });
  } catch (error) {
    console.error('getDashboardStats DB error:', error);
    res.status(500).json({ message: 'Failed to load dashboard metrics from database' });
  }
};

module.exports = {
  validatePII,
  submitIncident,
  getSubmissions,
  getSubmissionById,
  getEmployeeSubmissions,
  runPrediction,
  decideSubmission,
  getAssessments,
  getDashboardStats,
};
