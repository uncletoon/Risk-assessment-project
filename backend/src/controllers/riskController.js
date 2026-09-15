// ============================================================================
// Risk Controller
// Provides what-if simulation, risk analysis inspection, and detail queries
// ============================================================================

const { pool } = require("../config/db");
const {
  simulateMitigationImpact,
} = require("../engines/risk/calculationEngine");
const {
  getOrganizationMethodology,
} = require("../services/organizationService");

/**
 * Simulates the effect of proposed mitigation controls on residual risk and classification
 * Without persisting changes to the database
 */
const simulateRiskMitigation = async (req, res) => {
  try {
    const {
      risk_id,
      inherent_risk,
      current_residual,
      proposed_controls = [],
    } = req.body;

    let baselineInherent = Number(inherent_risk) || 20;
    let baselineResidual =
      current_residual !== undefined && current_residual !== null
        ? Number(current_residual)
        : null;

    let methodology = null;
    const orgId = req.user?.organization_id;
    if (orgId) {
      try {
        methodology = await getOrganizationMethodology(orgId);
      } catch (err) {
        // Fallback to default methodology
      }
    }

    // If a specific risk_id is provided, fetch its real data
    if (risk_id) {
      const riskQuery = await pool.query(
        `SELECT r.*, a.organization_id 
         FROM identified_risks r
         JOIN assessments a ON r.assessment_id = a.id
         WHERE r.id = $1`,
        [risk_id],
      );

      if (riskQuery.rows.length > 0) {
        const risk = riskQuery.rows[0];
        // Organization check
        const isSysAdmin =
          req.user?.role === "SYSTEM_ADMIN" || req.user?.role === "ADMIN";
        if (!isSysAdmin && orgId && risk.organization_id !== orgId) {
          return res
            .status(403)
            .json({ message: "Forbidden: Access denied to this risk" });
        }

        baselineInherent = Number(risk.inherent_risk) || 20;
        baselineResidual = Number(risk.residual_risk) || baselineInherent;
      }
    }

    if (!Array.isArray(proposed_controls)) {
      return res
        .status(400)
        .json({
          message: "proposed_controls must be an array of control objects",
        });
    }

    const simulation = simulateMitigationImpact({
      inherentRisk: baselineInherent,
      currentResidual: baselineResidual,
      proposedControls: proposed_controls,
      methodology,
    });

    res.json({
      success: true,
      riskId: risk_id || null,
      simulation,
    });
  } catch (err) {
    console.error("simulateRiskMitigation error:", err);
    res
      .status(500)
      .json({
        message: "Failed to simulate risk mitigation",
        error: err.message,
      });
  }
};

/**
 * Retrieves a single identified risk with its explainability and controls
 */
const getRiskDetails = async (req, res) => {
  try {
    const riskId = parseInt(req.params.id, 10);
    const riskRes = await pool.query(
      `SELECT r.*, a.organization_id, a.title as assessment_title
       FROM identified_risks r
       JOIN assessments a ON r.assessment_id = a.id
       WHERE r.id = $1`,
      [riskId],
    );

    if (riskRes.rows.length === 0) {
      return res.status(404).json({ message: "Risk not found" });
    }

    const risk = riskRes.rows[0];
    const isSysAdmin =
      req.user?.role === "SYSTEM_ADMIN" || req.user?.role === "ADMIN";
    if (
      !isSysAdmin &&
      req.user?.organization_id &&
      risk.organization_id !== req.user.organization_id
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: Access denied to this risk" });
    }

    const controlsRes = await pool.query(
      `SELECT * FROM risk_controls WHERE identified_risk_id = $1 ORDER BY created_at ASC`,
      [riskId],
    );

    const evidenceRes = await pool.query(
      `SELECT * FROM risk_evidence WHERE identified_risk_id = $1 ORDER BY created_at ASC`,
      [riskId],
    );

    res.json({
      ...risk,
      controls: controlsRes.rows,
      evidence: evidenceRes.rows,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch risk details", error: err.message });
  }
};

module.exports = {
  simulateRiskMitigation,
  getRiskDetails,
};
