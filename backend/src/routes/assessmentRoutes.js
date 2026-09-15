// ============================================================================
// Assessment Routes
// Enforces single-document uploads, pipeline triggering, and details querying
// ============================================================================

const express = require('express');
const router = express.Router();
const {
  createAssessmentHandler,
  uploadDocumentHandler,
  startAssessmentPipelineHandler,
  getAssessmentDetailsHandler,
  getAssessmentStatusHandler,
  listAssessmentsHandler,
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);

router.post('/', createAssessmentHandler);
router.get('/', listAssessmentsHandler);
router.get('/:id', getAssessmentDetailsHandler);
router.get('/:id/status', getAssessmentStatusHandler);
router.post('/:id/document', (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, uploadDocumentHandler);
router.post('/:id/process', startAssessmentPipelineHandler);

module.exports = router;
