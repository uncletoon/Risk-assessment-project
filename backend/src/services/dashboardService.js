// ============================================================================
// Dashboard Analytics Service
// Strictly isolated multi-tenant metrics per organization
// ============================================================================

const { pool } = require('../config/db');

async function getDashboardMetrics(organizationId = null) {
  const params = [];
  if (organizationId) {
    params.push(organizationId);
  }

  // 1. Fetch Latest Completed Assessment (strictly scoped to org if provided)
  const latestRes = await pool.query(
    `SELECT a.*, o.name as org_name, o.industry as org_industry
     FROM assessments a
     JOIN organizations o ON a.organization_id = o.id
     ${organizationId ? 'WHERE a.organization_id = $1 AND a.status = \'COMPLETED\'' : 'WHERE a.status = \'COMPLETED\''}
     ORDER BY a.completed_at DESC NULLS LAST, a.created_at DESC
     LIMIT 1`,
    params
  );

  const latestAssessment = latestRes.rows[0] || null;

  // 2. Fetch Category Scores & Top Risks for the latest assessment
  let categoryScores = [];
  let topRisks = [];
  if (latestAssessment) {
    const scoresRes = await pool.query(
      `SELECT s.*, c.name as category_name
       FROM risk_scores s
       JOIN risk_categories c ON s.category_code = c.code
       WHERE s.assessment_id = $1
       ORDER BY s.category_score DESC`,
      [latestAssessment.id]
    );
    categoryScores = scoresRes.rows;

    const topRisksRes = await pool.query(
      `SELECT r.*, c.name as category_name
       FROM identified_risks r
       JOIN risk_categories c ON r.category_code = c.code
       WHERE r.assessment_id = $1
       ORDER BY r.residual_risk DESC, r.inherent_risk DESC
       LIMIT 6`,
      [latestAssessment.id]
    );
    topRisks = topRisksRes.rows;
  }

  // 3. Mitigation Stats (strictly scoped to org if provided)
  const mitRes = await pool.query(
    `SELECT 
       COUNT(*) as total_actions,
       COUNT(*) FILTER (WHERE m.status = 'PENDING') as pending_count,
       COUNT(*) FILTER (WHERE m.status = 'IN_PROGRESS') as in_progress_count,
       COUNT(*) FILTER (WHERE m.status = 'COMPLETED') as completed_count,
       COALESCE(AVG(m.progress_pct), 0) as average_progress
     FROM mitigation_actions m
     ${organizationId ? 'JOIN assessments a ON m.assessment_id = a.id WHERE a.organization_id = $1' : ''}`,
    params
  );

  // 4. Longitudinal History / Trend (strictly scoped to org if provided)
  const histRes = await pool.query(
    `SELECT id, assessment_id, version_label, overall_eri, eri_classification, snapshot_date
     FROM assessment_history
     ${organizationId ? 'WHERE organization_id = $1' : ''}
     ORDER BY snapshot_date ASC
     LIMIT 10`,
    params
  );

  // 5. Total Assessments count (strictly scoped to org if provided)
  const countRes = await pool.query(
    `SELECT 
       COUNT(*) as total_assessments,
       COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
       COUNT(*) FILTER (WHERE status = 'PROCESSING' OR status = 'EXTRACTING' OR status = 'ASSESSING' OR status = 'ANALYZING') as active_processing_count
     FROM assessments
     ${organizationId ? 'WHERE organization_id = $1' : ''}`,
    params
  );

  return {
    latestAssessment,
    categoryScores,
    topRisks,
    mitigationStats: mitRes.rows[0] || {
      total_actions: 0,
      pending_count: 0,
      in_progress_count: 0,
      completed_count: 0,
      average_progress: 0,
    },
    historyTrend: histRes.rows || [],
    assessmentStats: countRes.rows[0] || {
      total_assessments: 0,
      completed_count: 0,
      active_processing_count: 0,
    },
  };
}

module.exports = {
  getDashboardMetrics,
};
