const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  validatePII,
  submitIncident,
  getSubmissions,
  getSubmissionById,
  getEmployeeSubmissions,
  runPrediction,
  decideSubmission,
  getAssessments,
  getDashboardStats,
} = require('../controllers/riskController');
const { protect } = require('../middleware/authMiddleware');

// Dashboard aggregated metrics directly from PostgreSQL
router.get('/dashboard-stats', getDashboardStats);

// Privacy & PII scanning for Employee uploads
router.post('/validate-pii', upload.single('file'), validatePII);

// Submit incident / risk report to PostgreSQL
router.post('/submit-incident', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, submitIncident);

// Employee's personal reports & officer feedback
router.get('/employee-submissions', getEmployeeSubmissions);

// Risk Officer view all submissions from PostgreSQL
router.get('/submissions', getSubmissions);
router.get('/submissions/:id', getSubmissionById);

// Risk Officer executes Gemini AI prediction against custom rules & saves to PostgreSQL
router.post('/submissions/:id/predict', runPrediction);

// Risk Officer records decision (CONFIRMED / REJECTED) in PostgreSQL
router.post('/submissions/:id/decision', decideSubmission);

// Confirmed assessments list from PostgreSQL
router.get('/assessments', getAssessments);



module.exports = router;