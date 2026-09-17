// ============================================================================
// Assessment Pipeline Orchestration Service
// Enforces Single-Document Rule, Deterministic Scoring, and Gemini AI Intelligence
// ============================================================================

const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const { parseDocument } = require("../parsers/documentParser");
const { evaluateFactsAgainstRules } = require("../engines/risk/ruleEngine");
const {
  calculateInherentRisk,
  evaluateControlEffectiveness,
  calculateResidualRisk,
  calculateCategoryScores,
  calculateEnterpriseRiskIndex,
} = require("../engines/risk/calculationEngine");
const {
  extractDocumentFactsAndRisks,
  generatePostCalculationIntelligence,
  queryContextualAdvisor,
  evaluateDocumentPrivacy,
} = require("../integrations/gemini/geminiService");
const { logAudit } = require("./auditService");
const { ASSESSMENT_STATUSES } = require("../constants/riskConstants");

/**
 * Creates a new assessment container (Strictly Single User / Client mode)
 */
async function createAssessment({
  organizationId,
  userId,
  title,
  clientName = null,
  client_name = null,
  clientIdentifier = null,
  client_identifier = null,
  ruleGroupId = null,
  rule_group_id = null,
}) {
  const orgRes = await pool.query("SELECT * FROM organizations WHERE id = $1", [
    organizationId,
  ]);
  if (orgRes.rows.length === 0) {
    throw new Error(`Organization with ID ${organizationId} does not exist`);
  }

  const cleanClientName = (clientName || client_name || "").trim();
  const cleanIdentifier = (clientIdentifier || client_identifier || "").trim();
  const assignedGroupId = ruleGroupId || rule_group_id || null;

  const finalTitle =
    title && title.trim()
      ? title.trim()
      : cleanClientName
        ? `Client Risk Assessment - ${cleanClientName}`
        : "Single Client Risk Assessment";

  const res = await pool.query(
    `INSERT INTO assessments (
      organization_id, created_by_id, title, target_type,
      client_name, client_identifier, rule_group_id,
      status, progress_step
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      organizationId,
      userId || null,
      finalTitle,
      "SINGLE_USER",
      cleanClientName || null,
      cleanIdentifier || null,
      assignedGroupId,
      ASSESSMENT_STATUSES.UPLOADED,
      "Awaiting Document Upload",
    ],
  );

  const assessment = res.rows[0];
  await logAudit(
    userId,
    organizationId,
    "ASSESSMENT_CREATED",
    "assessments",
    assessment.id,
    {
      title: assessment.title,
      targetType: "SINGLE_USER",
      clientName: assessment.client_name,
      ruleGroupId: assignedGroupId,
    },
  );
  return assessment;
}

/**
 * Attaches exactly ONE document to an assessment (Enforces Single-Document Rule)
 */
async function attachDocument({
  assessmentId,
  file,
  userId,
  allowReplace = false,
}) {
  if (!file) {
    throw new Error("No document file provided for upload.");
  }

  const assessRes = await pool.query(
    "SELECT * FROM assessments WHERE id = $1",
    [assessmentId],
  );
  if (assessRes.rows.length === 0) {
    throw new Error(`Assessment ${assessmentId} not found.`);
  }
  const assessment = assessRes.rows[0];

  // Check existing document
  const existingDocRes = await pool.query(
    "SELECT * FROM documents WHERE assessment_id = $1",
    [assessmentId],
  );
  if (existingDocRes.rows.length > 0) {
    if (
      !allowReplace &&
      assessment.status !== ASSESSMENT_STATUSES.UPLOADED &&
      assessment.status !== ASSESSMENT_STATUSES.FAILED
    ) {
      throw new Error(
        "Single-Document Rule Violation: An assessment may contain exactly ONE uploaded document. Replacing is disallowed after processing has begun.",
      );
    }
    // Delete existing document record before replacing
    await pool.query("DELETE FROM documents WHERE assessment_id = $1", [
      assessmentId,
    ]);
  }

  // Parse document preview and metadata
  const parsed = await parseDocument(
    file.path,
    file.originalname,
    file.mimetype,
  );

  const docRes = await pool.query(
    `INSERT INTO documents (assessment_id, filename, original_name, mime_type, file_size, file_path, extracted_text_preview, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      assessmentId,
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      file.path,
      parsed.preview,
      JSON.stringify(parsed.metadata),
    ],
  );

  await pool.query(
    `UPDATE assessments 
     SET status = $1, progress_step = $2, failure_reason = NULL 
     WHERE id = $3`,
    [
      ASSESSMENT_STATUSES.UPLOADED,
      "Document Uploaded & Validated",
      assessmentId,
    ],
  );

  await logAudit(
    userId,
    assessment.organization_id,
    "DOCUMENT_UPLOADED",
    "documents",
    docRes.rows[0].id,
    {
      originalName: file.originalname,
      fileSize: file.size,
    },
  );

  return docRes.rows[0];
}

/**
 * Runs the End-to-End Enterprise Risk Assessment Pipeline
 */
async function runAssessmentPipeline(assessmentId, userId = null) {
  // 1. Fetch assessment and document
  const assessRes = await pool.query(
    `SELECT a.*, o.name as org_name, o.industry as org_industry, o.description as org_description, o.methodology_config
     FROM assessments a
     JOIN organizations o ON a.organization_id = o.id
     WHERE a.id = $1`,
    [assessmentId],
  );

  if (assessRes.rows.length === 0) {
    throw new Error(`Assessment ${assessmentId} not found.`);
  }

  const assessment = assessRes.rows[0];
  const activeMethodology =
    assessment.methodology_snapshot || assessment.methodology_config || null;
  const docRes = await pool.query(
    "SELECT * FROM documents WHERE assessment_id = $1",
    [assessmentId],
  );
  if (docRes.rows.length === 0) {
    throw new Error("Cannot process assessment: No document uploaded yet.");
  }

  const documentRecord = docRes.rows[0];

  try {
    // Transition state: PROCESSING -> EXTRACTING
    await pool.query(
      `UPDATE assessments 
       SET status = $1, progress_step = $2 
       WHERE id = $3`,
      [
        ASSESSMENT_STATUSES.PROCESSING,
        "Parsing Document Content",
        assessmentId,
      ],
    );

    // Parse full text
    const parsedDoc = await parseDocument(
      documentRecord.file_path,
      documentRecord.original_name,
      documentRecord.mime_type,
    );

    if (!parsedDoc.text || parsedDoc.text.trim().length === 0) {
      throw new Error("Uploaded document contains no readable text content.");
    }

    // Privacy Gate: Verify document contains zero personal information
    const privacyCheck = await evaluateDocumentPrivacy(parsedDoc.text);
    if (privacyCheck.contains_personal_info) {
      await pool.query(
        `UPDATE assessments 
         SET progress_step = $1, failure_reason = $2 
         WHERE id = $3`,
        [
          "Personal Information Detected: Removal Required",
          privacyCheck.summary ||
            "Document contains personal identifiable information.",
          assessmentId,
        ],
      );

      const itemsDescription = (privacyCheck.detected_items || [])
        .map((item) => `${item.type}: ${item.snippet}`)
        .join("; ");

      const error = new Error(
        `Privacy Gate Rejected: Personal information detected in document. Please sanitize and re-upload. Detected: ${itemsDescription || privacyCheck.summary}`,
      );
      error.privacyEvaluation = privacyCheck;
      throw error;
    }

    await pool.query(
      `UPDATE assessments 
       SET status = $1, progress_step = $2 
       WHERE id = $3`,
      [
        ASSESSMENT_STATUSES.EXTRACTING,
        "Gemini Extracting Facts & Discovering Evidence",
        assessmentId,
      ],
    );

    // Load active Risk Categories and Rules configured for the selected Rule Group
    const catDbRes = await pool.query(
      "SELECT code, name, default_weight, description FROM risk_categories WHERE is_active = true ORDER BY code ASC",
    );
    const categoriesConfig = catDbRes.rows;

    let activeRules = [];
    if (assessment.rule_group_id) {
      const groupRulesRes = await pool.query(
        "SELECT * FROM risk_rules WHERE is_active = true AND rule_group_id = $1 ORDER BY category_code ASC, id ASC",
        [assessment.rule_group_id],
      );
      if (groupRulesRes.rows.length > 0) {
        activeRules = groupRulesRes.rows;
      }
    }

    // If no group-specific rules found, fallback to all active rules
    if (activeRules.length === 0) {
      const defaultRulesRes = await pool.query(
        "SELECT * FROM risk_rules WHERE is_active = true ORDER BY category_code ASC, id ASC",
      );
      activeRules = defaultRulesRes.rows;
    }

    // Target Profile for AI: STRICTLY ANONYMOUS (Client Name and Number remain strictly in DB)
    const targetProfile = {
      target_type: "SINGLE_USER",
    };

    const extractionResult = await extractDocumentFactsAndRisks(
      parsedDoc.text,
      targetProfile,
      categoriesConfig,
      activeRules,
    );

    // Clear any previous records for clean run
    await pool.query("DELETE FROM extracted_facts WHERE assessment_id = $1", [
      assessmentId,
    ]);
    await pool.query("DELETE FROM identified_risks WHERE assessment_id = $1", [
      assessmentId,
    ]);
    await pool.query("DELETE FROM risk_scores WHERE assessment_id = $1", [
      assessmentId,
    ]);
    await pool.query("DELETE FROM ai_analyses WHERE assessment_id = $1", [
      assessmentId,
    ]);
    await pool.query(
      "DELETE FROM ai_recommendations WHERE assessment_id = $1",
      [assessmentId],
    );

    // Save Extracted Facts
    for (const fact of extractionResult.extracted_facts || []) {
      await pool.query(
        `INSERT INTO extracted_facts (assessment_id, category_code, fact_key, fact_value, numerical_value, raw_evidence_text, source_location, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          assessmentId,
          (fact.category_code || "FINANCIAL").toUpperCase(),
          fact.fact_key || "Fact",
          fact.fact_value || "",
          typeof fact.numerical_value === "number"
            ? fact.numerical_value
            : null,
          fact.raw_evidence_text || fact.fact_value || "",
          fact.source_location || "Document",
          fact.confidence || 0.95,
        ],
      );
    }

    // Transition state: ASSESSING (Deterministic Risk Engine)
    await pool.query(
      `UPDATE assessments 
       SET status = $1, progress_step = $2, document_summary = $3 
       WHERE id = $4`,
      [
        ASSESSMENT_STATUSES.ASSESSING,
        "Deterministic Risk Engine Calculating Inherent & Residual Scores",
        extractionResult.document_summary || "",
        assessmentId,
      ],
    );

    // Load active DB rules and evaluate facts
    const matchedRules = await evaluateFactsAgainstRules(
      extractionResult.extracted_facts,
      activeRules,
    );

    const calculatedRisks = [];

    // Process Candidate Risks
    for (const candidate of extractionResult.candidate_risks || []) {
      const catCode = (candidate.category_code || "OPERATIONAL").toUpperCase();

      // Check if a business rule matched this factor
      const matchingRule = matchedRules.find(
        (m) =>
          m.categoryCode === catCode &&
          (candidate.risk_name
            .toLowerCase()
            .includes(m.factorName.toLowerCase()) ||
            candidate.risk_description
              .toLowerCase()
              .includes(m.factorName.toLowerCase())),
      );

      // Deterministic likelihood and impact
      const likelihood = matchingRule
        ? matchingRule.likelihoodScore
        : candidate.suggested_likelihood || 3;
      const impact = matchingRule
        ? matchingRule.impactScore
        : candidate.suggested_impact || 3;

      const inherentResult = calculateInherentRisk(
        likelihood,
        impact,
        activeMethodology,
      );

      // Internal Controls Evaluation
      const controlEval = evaluateControlEffectiveness(
        candidate.controls_identified || [],
      );

      // Residual Risk Calculation
      const residualResult = calculateResidualRisk(
        inherentResult.inherentRisk,
        controlEval.effectivenessPct,
        controlEval.status,
        activeMethodology,
        candidate.controls_identified || [],
      );

      // Save Identified Risk
      const riskInsertRes = await pool.query(
        `INSERT INTO identified_risks (
          assessment_id, category_code, risk_name, risk_description,
          likelihood, impact, inherent_risk, inherent_classification,
          control_score, control_status, residual_risk, residual_classification,
          explanation, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          assessmentId,
          catCode,
          candidate.risk_name || "Identified Enterprise Risk",
          candidate.risk_description || "",
          inherentResult.likelihood,
          inherentResult.impact,
          inherentResult.inherentRisk,
          inherentResult.classification,
          controlEval.effectivenessPct,
          controlEval.status,
          residualResult.residualRisk,
          residualResult.classification,
          matchingRule
            ? `Triggered Rule [${matchingRule.factorName}]: ${matchingRule.description}. ${residualResult.explanation}`
            : residualResult.explanation,
          candidate.confidence || "High",
        ],
      );

      const savedRisk = riskInsertRes.rows[0];

      // Save Traceable Risk Evidence
      if (candidate.evidence_quote || candidate.source_location) {
        await pool.query(
          `INSERT INTO risk_evidence (identified_risk_id, evidence_text, source_location, confidence)
           VALUES ($1, $2, $3, $4)`,
          [
            savedRisk.id,
            candidate.evidence_quote ||
              "Evidence extracted from document analysis.",
            candidate.source_location || "General",
            candidate.confidence || "High",
          ],
        );
      }

      // Save Controls
      if (
        candidate.controls_identified &&
        Array.isArray(candidate.controls_identified)
      ) {
        for (const ctrl of candidate.controls_identified) {
          await pool.query(
            `INSERT INTO risk_controls (identified_risk_id, control_name, control_type, effectiveness_pct, status, source_evidence)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              savedRisk.id,
              ctrl.control_name || "Control mechanism",
              ctrl.control_type || "PREVENTATIVE",
              ctrl.effectiveness_pct || 0,
              ctrl.status || "EVALUATED",
              ctrl.evidence || "",
            ],
          );
        }
      }

      calculatedRisks.push({
        id: savedRisk.id,
        category_code: catCode,
        risk_name: savedRisk.risk_name,
        likelihood: savedRisk.likelihood,
        impact: savedRisk.impact,
        inherent_risk: savedRisk.inherent_risk,
        residual_risk: savedRisk.residual_risk,
        residual_classification: savedRisk.residual_classification,
        control_score: savedRisk.control_score,
        control_status: savedRisk.control_status,
        evidence_quote: candidate.evidence_quote,
        source_location: candidate.source_location,
      });
    }

    // Deterministic Category Score Calculation
    const categoryScores = calculateCategoryScores(
      calculatedRisks,
      activeMethodology || categoriesConfig,
    );
    const eriResult = calculateEnterpriseRiskIndex(
      categoryScores,
      activeMethodology,
    );

    // Save Risk Scores for each category
    for (const key of Object.keys(categoryScores)) {
      const cat = categoryScores[key];
      await pool.query(
        `INSERT INTO risk_scores (assessment_id, category_code, category_score, category_weight, weighted_score)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          assessmentId,
          cat.categoryCode,
          cat.categoryScore,
          cat.weight,
          cat.weightedScore,
        ],
      );
    }

    // Transition state: ANALYZING (Gemini Post-Calculation Narrative)
    await pool.query(
      `UPDATE assessments 
       SET status = $1, progress_step = $2, overall_eri = $3, eri_classification = $4,
           methodology_snapshot = $5, eri_explanation = $6 
       WHERE id = $7`,
      [
        ASSESSMENT_STATUSES.ANALYZING,
        "Gemini Synthesizing Intelligence, Drivers & Action Priorities",
        eriResult.eriScore,
        eriResult.classification,
        JSON.stringify(activeMethodology || {}),
        eriResult.explanation,
        assessmentId,
      ],
    );

    const postContext = {
      targetProfile,
      organization: targetProfile,
      extractedFacts: extractionResult.extracted_facts,
      calculatedRisks,
      categoryScores,
      eriResult,
    };

    const intelligence = await generatePostCalculationIntelligence(postContext);

    // Save AI Analysis
    await pool.query(
      `INSERT INTO ai_analyses (assessment_id, executive_summary, risk_position_overview, top_risk_drivers, strategic_implications)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        assessmentId,
        intelligence.executive_summary,
        intelligence.risk_position_overview,
        JSON.stringify(intelligence.top_risk_drivers || []),
        intelligence.strategic_implications,
      ],
    );

    // Save AI Recommendations
    for (const rec of intelligence.recommendations || []) {
      // Find matching identified risk if any
      const matchingRisk = calculatedRisks.find(
        (r) =>
          r.risk_name
            .toLowerCase()
            .includes((rec.risk_name || "").toLowerCase()) ||
          (rec.risk_name || "")
            .toLowerCase()
            .includes(r.risk_name.toLowerCase()),
      );

      await pool.query(
        `INSERT INTO ai_recommendations (assessment_id, identified_risk_id, title, recommendation_text, priority, suggested_timeframe, expected_outcome)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          assessmentId,
          matchingRisk ? matchingRisk.id : null,
          rec.title || "Risk Mitigation Action",
          rec.recommendation_text || "",
          ["IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM"].includes(rec.priority)
            ? rec.priority
            : "SHORT_TERM",
          rec.suggested_timeframe || "30 days",
          rec.expected_outcome || "",
        ],
      );
    }

    // Save Snapshot to Assessment History
    const historyCount = await pool.query(
      "SELECT count(*) FROM assessment_history WHERE organization_id = $1",
      [assessment.organization_id],
    );
    const versionLabel = `v${parseInt(historyCount.rows[0].count, 10) + 1}.0`;

    await pool.query(
      `INSERT INTO assessment_history (assessment_id, organization_id, version_label, overall_eri, eri_classification, category_scores)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        assessmentId,
        assessment.organization_id,
        versionLabel,
        eriResult.eriScore,
        eriResult.classification,
        JSON.stringify(categoryScores),
      ],
    );

    // Finalize Assessment: COMPLETED
    await pool.query(
      `UPDATE assessments 
       SET status = $1, progress_step = $2, completed_at = NOW() 
       WHERE id = $3`,
      [
        ASSESSMENT_STATUSES.COMPLETED,
        "Assessment Completed Successfully",
        assessmentId,
      ],
    );

    await logAudit(
      userId,
      assessment.organization_id,
      "ASSESSMENT_COMPLETED",
      "assessments",
      assessmentId,
      {
        eriScore: eriResult.eriScore,
        classification: eriResult.classification,
        risksCount: calculatedRisks.length,
      },
    );

    return await getAssessmentDetails(assessmentId);
  } catch (err) {
    console.error(
      `Assessment Pipeline failed for assessment ${assessmentId}:`,
      err,
    );
    await pool.query(
      `UPDATE assessments 
       SET status = $1, progress_step = $2, failure_reason = $3 
       WHERE id = $4`,
      [
        ASSESSMENT_STATUSES.FAILED,
        "Assessment Failed",
        err.message,
        assessmentId,
      ],
    );
    throw err;
  }
}

/**
 * Fetches complete consolidated assessment details
 */
async function getAssessmentDetails(assessmentId) {
  const [
    assessRes,
    docRes,
    factsRes,
    risksRes,
    scoresRes,
    aiAnalysisRes,
    recommendationsRes,
    mitigationsRes,
  ] = await Promise.all([
    pool.query(
      `SELECT a.*, o.name as org_name, o.industry as org_industry, o.description as org_description,
              u.full_name as creator_name,
              rg.name as rule_group_name
       FROM assessments a
       JOIN organizations o ON a.organization_id = o.id
       LEFT JOIN users u ON a.created_by_id = u.id
       LEFT JOIN rule_groups rg ON a.rule_group_id = rg.id
       WHERE a.id = $1`,
      [assessmentId],
    ),
    pool.query("SELECT * FROM documents WHERE assessment_id = $1", [
      assessmentId,
    ]),
    pool.query(
      "SELECT * FROM extracted_facts WHERE assessment_id = $1 ORDER BY id ASC",
      [assessmentId],
    ),
    pool.query(
      `SELECT r.*, c.name as category_name,
              COALESCE(json_agg(DISTINCT e.*) FILTER (WHERE e.id IS NOT NULL), '[]') as evidence_list,
              COALESCE(json_agg(DISTINCT ctrl.*) FILTER (WHERE ctrl.id IS NOT NULL), '[]') as controls_list
       FROM identified_risks r
       JOIN risk_categories c ON r.category_code = c.code
       LEFT JOIN risk_evidence e ON r.id = e.identified_risk_id
       LEFT JOIN risk_controls ctrl ON r.id = ctrl.identified_risk_id
       WHERE r.assessment_id = $1
       GROUP BY r.id, c.name
       ORDER BY r.residual_risk DESC, r.inherent_risk DESC`,
      [assessmentId],
    ),
    pool.query(
      `SELECT s.*, c.name as category_name, c.description as category_desc
       FROM risk_scores s
       JOIN risk_categories c ON s.category_code = c.code
       WHERE s.assessment_id = $1
       ORDER BY s.category_code ASC`,
      [assessmentId],
    ),
    pool.query("SELECT * FROM ai_analyses WHERE assessment_id = $1", [
      assessmentId,
    ]),
    pool.query(
      `SELECT rec.*, r.risk_name, r.category_code,
              EXISTS (
                SELECT 1 FROM mitigation_actions m 
                WHERE m.recommendation_id = rec.id 
                   OR (m.assessment_id = rec.assessment_id AND m.title = rec.title)
              ) as is_converted,
              (
                SELECT m.id FROM mitigation_actions m 
                WHERE m.recommendation_id = rec.id 
                   OR (m.assessment_id = rec.assessment_id AND m.title = rec.title)
                LIMIT 1
              ) as mitigation_id
       FROM ai_recommendations rec
       LEFT JOIN identified_risks r ON rec.identified_risk_id = r.id
       WHERE rec.assessment_id = $1
       ORDER BY 
         CASE rec.priority 
           WHEN 'IMMEDIATE' THEN 1 
           WHEN 'SHORT_TERM' THEN 2 
           ELSE 3 
         END ASC, rec.id ASC`,
      [assessmentId],
    ),
    pool.query(
      `SELECT m.*, r.risk_name, r.category_code
       FROM mitigation_actions m
       LEFT JOIN identified_risks r ON m.identified_risk_id = r.id
       WHERE m.assessment_id = $1
       ORDER BY m.created_at DESC`,
      [assessmentId],
    ),
  ]);

  if (assessRes.rows.length === 0) {
    throw new Error(`Assessment ${assessmentId} not found.`);
  }

  return {
    assessment: assessRes.rows[0],
    document: docRes.rows[0] || null,
    extractedFacts: factsRes.rows,
    identifiedRisks: risksRes.rows,
    riskScores: scoresRes.rows,
    aiAnalysis: aiAnalysisRes.rows[0] || null,
    recommendations: recommendationsRes.rows,
    mitigations: mitigationsRes.rows,
  };
}

/**
 * Lists all assessments with optional organization filtering
 */
async function getAssessments(organizationId = null) {
  let query = `
    SELECT a.*, o.name as org_name, d.original_name as document_name, d.file_size,
           u.full_name as creator_name, rg.name as rule_group_name,
           (SELECT count(*) FROM identified_risks WHERE assessment_id = a.id) as risk_count,
           (SELECT count(*) FROM mitigation_actions WHERE assessment_id = a.id) as mitigation_count
    FROM assessments a
    JOIN organizations o ON a.organization_id = o.id
    LEFT JOIN documents d ON a.id = d.assessment_id
    LEFT JOIN users u ON a.created_by_id = u.id
    LEFT JOIN rule_groups rg ON a.rule_group_id = rg.id
  `;
  const params = [];

  if (organizationId) {
    query += " WHERE a.organization_id = $1";
    params.push(organizationId);
  }

  query += " ORDER BY a.created_at DESC";

  const res = await pool.query(query, params);
  return res.rows;
}

/**
 * Evaluates the uploaded document of an assessment for personal information
 */
async function evaluateAssessmentPrivacy(assessmentId, userId = null) {
  const assessRes = await pool.query(
    "SELECT id, organization_id, title FROM assessments WHERE id = $1",
    [assessmentId],
  );
  if (assessRes.rows.length === 0) {
    throw new Error(`Assessment with ID ${assessmentId} not found.`);
  }

  const docRes = await pool.query(
    "SELECT * FROM documents WHERE assessment_id = $1",
    [assessmentId],
  );
  if (docRes.rows.length === 0) {
    throw new Error("No document uploaded for this assessment yet.");
  }

  const documentRecord = docRes.rows[0];
  const parsedDoc = await parseDocument(
    documentRecord.file_path,
    documentRecord.original_name,
    documentRecord.mime_type,
  );

  const privacyResult = await evaluateDocumentPrivacy(parsedDoc.text || "");

  const progressStep = privacyResult.contains_personal_info
    ? "Personal Information Detected: Removal Required"
    : "Privacy Validated: Clean";

  await pool.query(
    `UPDATE assessments 
     SET progress_step = $1,
         failure_reason = $2 
     WHERE id = $3`,
    [
      progressStep,
      privacyResult.contains_personal_info ? privacyResult.summary : null,
      assessmentId,
    ],
  );

  await logAudit(
    userId,
    assessRes.rows[0].organization_id,
    "DOCUMENT_PRIVACY_EVALUATED",
    "assessments",
    assessmentId,
    {
      contains_personal_info: privacyResult.contains_personal_info,
      detected_count: (privacyResult.detected_items || []).length,
      summary: privacyResult.summary,
    },
  );

  return {
    assessmentId,
    ...privacyResult,
  };
}

module.exports = {
  createAssessment,
  attachDocument,
  runAssessmentPipeline,
  getAssessmentDetails,
  getAssessments,
  evaluateAssessmentPrivacy,
};
