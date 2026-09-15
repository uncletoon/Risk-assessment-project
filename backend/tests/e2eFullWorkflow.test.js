// ============================================================================
// End-to-End Enterprise Risk Assessment Pipeline Verification
// Tests complete flow: Auth -> Create Assessment -> Upload 1 Doc -> Process Pipeline
// -> Deterministic Scoring -> Gemini AI Analysis -> Mitigations -> AI Advisor -> Report
// ============================================================================

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { pool } = require('../src/config/db');
const { authenticateUser } = require('../src/services/authService');
const {
  createAssessment,
  attachDocument,
  runAssessmentPipeline,
  getAssessmentDetails,
} = require('../src/services/assessmentService');
const {
  createMitigationAction,
  updateMitigationAction,
  getMitigationsByAssessment,
} = require('../src/services/mitigationService');
const { queryContextualAdvisor } = require('../src/integrations/gemini/geminiService');
const { generateAssessmentReport } = require('../src/services/reportService');
const { getDashboardMetrics } = require('../src/services/dashboardService');

async function runE2E() {
  console.log('===============================================================');
  console.log('STARTING ERIDSS FULL END-TO-END WORKFLOW VERIFICATION');
  console.log('===============================================================');

  // 1. Authenticate Risk Officer
  console.log('\n[Step 1] Authenticating Risk Officer...');
  const officer = await authenticateUser('officer@eridss.com', 'Officer@123');
  assert.ok(officer.token, 'Officer JWT token generated');
  console.log(`✓ Authenticated as ${officer.full_name} (${officer.role})`);

  // 2. Create Single-Doc Assessment
  console.log('\n[Step 2] Creating Assessment Container for Organization...');
  const assessment = await createAssessment({
    organizationId: 1,
    userId: officer.id,
    title: 'Q3 Enterprise Risk Audit & Underwriting Stance',
  });
  assert.ok(assessment.id, 'Assessment ID created');
  assert.strictEqual(assessment.status, 'UPLOADED');
  console.log(`✓ Assessment #${assessment.id} created in state: ${assessment.status}`);

  // 3. Attach Exactly One Business Document
  console.log('\n[Step 3] Attaching 1 Enterprise Business Document...');
  const testDocPath = path.resolve(__dirname, '../../test_data/loan_portfolio_history.csv');
  const docStats = fs.statSync(testDocPath);

  const doc = await attachDocument({
    assessmentId: assessment.id,
    file: {
      filename: 'loan_portfolio_history.csv',
      originalname: 'Apex_Q3_Financial_and_Operational_Portfolio.csv',
      mimetype: 'text/csv',
      size: docStats.size,
      path: testDocPath,
    },
    userId: officer.id,
    allowReplace: false,
  });
  assert.ok(doc.id, 'Document attached');
  console.log(`✓ Document "${doc.original_name}" attached (${(doc.file_size / 1024).toFixed(1)} KB)`);

  // 4. Run Full Pipeline (Extraction -> Deterministic Engine -> ERI -> Gemini Analysis)
  console.log('\n[Step 4] Launching End-to-End Processing Pipeline...');
  console.log(' - Ingesting document & extracting text');
  console.log(' - Gemini extracting structured facts & candidate risks');
  console.log(' - Deterministic engine calculating Inherent, Control & Residual risks');
  console.log(' - Deterministic ERI normalization across 6 enterprise categories');
  console.log(' - Gemini synthesizing executive summary, drivers & prioritized recommendations');

  const processedData = await runAssessmentPipeline(assessment.id, officer.id);
  assert.strictEqual(processedData.assessment.status, 'COMPLETED');
  assert.ok(processedData.assessment.overall_eri !== null, 'ERI calculated');
  assert.ok(processedData.assessment.eri_classification, 'ERI classification assigned');
  assert.ok(processedData.identifiedRisks.length > 0, 'Identified risks persisted');
  assert.ok(processedData.riskScores.length === 6, '6 Category scores persisted');
  assert.ok(processedData.aiAnalysis, 'AI analysis generated');
  assert.ok(processedData.recommendations.length > 0, 'Recommendations generated');

  console.log('\n✓ Assessment Pipeline Completed Successfully!');
  console.log(` - Overall ERI: ${Number(processedData.assessment.overall_eri).toFixed(1)} / 100 (${processedData.assessment.eri_classification})`);
  console.log(` - Extracted Facts: ${processedData.extractedFacts.length}`);
  console.log(` - Identified Risks: ${processedData.identifiedRisks.length}`);
  console.log(` - Category Scores:`);
  processedData.riskScores.forEach(s => {
    console.log(`    • ${s.category_code} (${s.category_name}): Score ${Number(s.category_score).toFixed(1)} | Weight ${Number(s.category_weight)}% | Weighted ${Number(s.weighted_score).toFixed(2)}`);
  });

  // Verify Evidence Traceability
  console.log('\n[Step 5] Verifying Evidence Traceability...');
  const firstRisk = processedData.identifiedRisks[0];
  console.log(` - Sample Risk: "${firstRisk.risk_name}"`);
  console.log(`   Likelihood: ${firstRisk.likelihood}/5 | Impact: ${firstRisk.impact}/5 => Inherent: ${firstRisk.inherent_risk}/25 (${firstRisk.inherent_classification})`);
  console.log(`   Control Effectiveness: ${firstRisk.control_score}% (${firstRisk.control_status}) => Residual: ${firstRisk.residual_risk} (${firstRisk.residual_classification})`);
  if (firstRisk.evidence_list && firstRisk.evidence_list.length > 0) {
    console.log(`   Verbatim Evidence: "${firstRisk.evidence_list[0].evidence_text}"`);
    console.log(`   Source Reference: ${firstRisk.evidence_list[0].source_location}`);
  }

  // 5. Convert Recommendation to Mitigation Action
  console.log('\n[Step 6] Converting AI Recommendation to Actionable Mitigation...');
  const firstRec = processedData.recommendations[0];
  const mitigation = await createMitigationAction({
    assessmentId: assessment.id,
    identifiedRiskId: firstRec.identified_risk_id,
    recommendationId: firstRec.id,
    title: firstRec.title,
    actionDescription: firstRec.recommendation_text,
    priority: firstRec.priority === 'IMMEDIATE' ? 'CRITICAL' : 'HIGH',
    assignedTo: 'Elena Rostova (Chief Risk Officer)',
    department: 'Risk & Operations',
    dueDate: '2026-09-30',
    expectedOutcome: firstRec.expected_outcome,
    userId: officer.id,
  });
  assert.ok(mitigation.id, 'Mitigation action created');
  console.log(`✓ Mitigation Action #${mitigation.id} created: "${mitigation.title}"`);

  // Update Mitigation Progress
  console.log(' - Updating mitigation progress to 50% (IN_PROGRESS)...');
  const updatedMit = await updateMitigationAction(mitigation.id, {
    status: 'IN_PROGRESS',
    progress_pct: 50,
    notes: 'Risk committee approved mitigation budget.',
  }, officer.id);
  assert.strictEqual(updatedMit.progress_pct, 50);
  console.log(`✓ Mitigation updated to state: ${updatedMit.status} (${updatedMit.progress_pct}%)`);

  // 6. Consult Grounded AI Risk Advisor
  console.log('\n[Step 7] Testing Contextual Grounded AI Risk Advisor...');
  const advisorSummary = {
    organization: { name: processedData.assessment.org_name },
    assessment: {
      title: processedData.assessment.title,
      overallERI: processedData.assessment.overall_eri,
      classification: processedData.assessment.eri_classification,
    },
    categoryScores: processedData.riskScores,
    identifiedRisks: processedData.identifiedRisks,
    recommendations: processedData.recommendations,
  };

  const advisorQuery = 'What is our highest risk and what immediate action is recommended?';
  console.log(` - Question: "${advisorQuery}"`);
  const advisorRes = await queryContextualAdvisor(advisorQuery, advisorSummary);
  assert.ok(advisorRes.answer && advisorRes.answer.length > 0, 'Advisor provided answer');
  console.log(`✓ AI Advisor Response:\n"${advisorRes.answer.slice(0, 300)}..."`);

  // 7. Generate Formal Report
  console.log('\n[Step 8] Generating Formal Risk Report...');
  const report = await generateAssessmentReport(assessment.id);
  assert.ok(report.reportMetadata.reportId, 'Report ID generated');
  assert.strictEqual(report.assessment.id, assessment.id);
  console.log(`✓ Formal Audit Report #${report.reportMetadata.reportId} generated successfully.`);

  // 8. Fetch Dashboard Metrics
  console.log('\n[Step 9] Fetching Aggregated Dashboard Metrics...');
  const dashboard = await getDashboardMetrics();
  assert.ok(dashboard.latestAssessment, 'Latest assessment in dashboard');
  console.log(`✓ Dashboard verified: Latest ERI is ${Number(dashboard.latestAssessment.overall_eri).toFixed(1)} with ${dashboard.historyTrend.length} longitudinal snapshots.`);

  console.log('\n===============================================================');
  console.log('ALL ERIDSS END-TO-END ACCEPTANCE TESTS PASSED (100%)');
  console.log('===============================================================');
}

if (require.main === module) {
  runE2E()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('\n❌ E2E Verification Failed:', err);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runE2E };
