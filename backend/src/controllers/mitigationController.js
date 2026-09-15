// ============================================================================
// Mitigation Controller
// ============================================================================

const {
  createMitigationAction,
  updateMitigationAction,
  getMitigationsByAssessment,
  getAllMitigations,
  getMitigationStats,
} = require('../services/mitigationService');

const isUserAdmin = (user) => user?.role === 'SYSTEM_ADMIN' || user?.role === 'ADMIN';

const createMitigation = async (req, res) => {
  try {
    const isSysAdmin = isUserAdmin(req.user);
    const userOrgId = isSysAdmin ? null : req.user?.organization_id;

    const action = await createMitigationAction(
      {
        ...req.body,
        userId: req.user?.id,
      },
      userOrgId
    );
    res.status(201).json(action);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateMitigation = async (req, res) => {
  try {
    const isSysAdmin = isUserAdmin(req.user);
    const userOrgId = isSysAdmin ? null : req.user?.organization_id;

    const updated = await updateMitigationAction(req.params.id, req.body, req.user?.id, userOrgId);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const listMitigations = async (req, res) => {
  try {
    const isSysAdmin = isUserAdmin(req.user);
    const { assessmentId, organizationId } = req.query;

    if (assessmentId) {
      const userOrgId = isSysAdmin ? null : req.user?.organization_id;
      const actions = await getMitigationsByAssessment(parseInt(assessmentId, 10), userOrgId);
      return res.json(actions);
    }

    const orgId = isSysAdmin
      ? (organizationId ? parseInt(organizationId, 10) : null)
      : req.user?.organization_id;

    const actions = await getAllMitigations(orgId);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch mitigations', error: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const isSysAdmin = isUserAdmin(req.user);
    const orgId = isSysAdmin
      ? (req.query.organizationId ? parseInt(req.query.organizationId, 10) : null)
      : req.user?.organization_id;

    const stats = await getMitigationStats(orgId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch mitigation stats', error: err.message });
  }
};

module.exports = {
  createMitigation,
  updateMitigation,
  listMitigations,
  getStats,
};
