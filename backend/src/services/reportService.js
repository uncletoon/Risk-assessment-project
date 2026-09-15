// ============================================================================
// Formal Risk Report Service
// ============================================================================

const { getAssessmentDetails } = require('./assessmentService');

async function generateAssessmentReport(assessmentId) {
  const data = await getAssessmentDetails(assessmentId);

  return {
    reportMetadata: {
      reportId: `RPT-ERIDSS-${assessmentId}-${Date.now().toString().slice(-4)}`,
      generatedAt: new Date().toISOString(),
      system: 'Enterprise Risk Intelligence and Decision Support System (ERIDSS)',
      confidentiality: 'CONFIDENTIAL // BOARD & EXECUTIVE RISK COMMITTEE ONLY',
    },
    organization: {
      name: data.assessment.org_name,
      industry: data.assessment.org_industry,
      description: data.assessment.org_description,
    },
    assessment: {
      id: data.assessment.id,
      title: data.assessment.title,
      status: data.assessment.status,
      overallERI: data.assessment.overall_eri,
      eriClassification: data.assessment.eri_classification,
      completedAt: data.assessment.completed_at,
      documentSummary: data.assessment.document_summary,
    },
    document: data.document ? {
      filename: data.document.original_name,
      mimeType: data.document.mime_type,
      fileSizeBytes: data.document.file_size,
      uploadedAt: data.document.created_at,
    } : null,
    executiveSummary: data.aiAnalysis?.executive_summary || 'Executive summary not generated.',
    riskPositionOverview: data.aiAnalysis?.risk_position_overview || '',
    topDrivers: data.aiAnalysis?.top_risk_drivers || [],
    strategicImplications: data.aiAnalysis?.strategic_implications || '',
    categoryBreakdown: data.riskScores,
    identifiedRisks: data.identifiedRisks,
    aiRecommendations: data.recommendations,
    mitigationActionPlan: data.mitigations,
  };
}

module.exports = {
  generateAssessmentReport,
};
