// ============================================================================
// Dashboard Controller
// ============================================================================

const { getDashboardMetrics } = require('../services/dashboardService');

const getDashboard = async (req, res) => {
  try {
    const isSysAdmin = req.user?.role === 'SYSTEM_ADMIN' || req.user?.role === 'ADMIN';
    const orgId = isSysAdmin
      ? (req.query.organizationId ? parseInt(req.query.organizationId, 10) : null)
      : req.user?.organization_id;

    const metrics = await getDashboardMetrics(orgId);
    res.json(metrics);
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard metrics', error: err.message });
  }
};

module.exports = {
  getDashboard,
};
