// ============================================================================
// Report Controller
// ============================================================================

const { getAssessmentDetails } = require('../services/assessmentService');
const { generateAssessmentReport } = require('../services/reportService');

const isUserAdmin = (user) => user?.role === 'SYSTEM_ADMIN' || user?.role === 'ADMIN';

const getReport = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.assessmentId, 10);
    const details = await getAssessmentDetails(assessmentId);

    if (!isUserAdmin(req.user) && details.assessment.organization_id !== req.user?.organization_id) {
      return res.status(403).json({ message: 'Forbidden: Access denied to reports from another organization' });
    }

    const report = await generateAssessmentReport(assessmentId);
    res.json(report);
  } catch (err) {
    console.error('getReport error:', err);
    res.status(404).json({ message: err.message });
  }
};

module.exports = {
  getReport,
};
