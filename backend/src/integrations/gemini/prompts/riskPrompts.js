// ============================================================================
// Single Client Credit Risk Intelligence Prompts
// Strictly structured, versioned, and domain-grounded prompt templates
// ============================================================================

/**
 * Prompt for Step 1: Structured Document Extraction & Risk Discovery
 */
function buildDocumentExtractionPrompt(
  documentText,
  targetProfile,
  activeCategories = [],
  activeRules = [],
) {
  // Target context is strictly Single User / Client, evaluated completely anonymously
  const targetDetails =
    "Assessment Target: SINGLE INDIVIDUAL USER / CLIENT (ANONYMIZED EVALUATION - Evaluate document facts and risks strictly against active risk categories and deterministic rules without personal identity attributes)";

  // Format active categories configured by Risk Officer
  const categoriesListText =
    activeCategories && activeCategories.length > 0
      ? activeCategories
          .map(
            (c, i) =>
              `${i + 1}. ${c.code} (${c.name}) - Configured Weight: ${c.default_weight || c.weight}% - Focus: ${c.description || "Risk evaluation"}`,
          )
          .join("\n")
      : `1. REPAYMENT_CAPACITY (Proposed repayment affordability, disposable income, debt service capacity)
    2. DEBT_BURDEN (Existing obligations, debt-to-income, leverage, and borrowing headroom)
    3. INCOME_STABILITY (Income consistency, cash flow volatility, employment or business continuity)
    4. CREDIT_BEHAVIOR (Credit history, arrears, missed payments, and account conduct)
    5. COLLATERAL_GUARANTEE (Collateral value, ownership, enforceability, guarantor strength, and coverage)
    6. KYC_DATA_QUALITY (Identity consistency, document reliability, missing information, and fraud indicators)`;

  const validCategoryCodes =
    activeCategories && activeCategories.length > 0
      ? activeCategories.map((c) => `"${c.code}"`).join(" | ")
      : '"REPAYMENT_CAPACITY" | "DEBT_BURDEN" | "INCOME_STABILITY" | "CREDIT_BEHAVIOR" | "COLLATERAL_GUARANTEE" | "KYC_DATA_QUALITY"';

  // Format active rules configured by Risk Officer
  const rulesListText =
    activeRules && activeRules.length > 0
      ? activeRules
          .map(
            (r, i) =>
              `• [${r.category_code}] Factor: "${r.factor_name}" | Condition: ${r.condition_operator} "${r.threshold_value}" | Severity: ${r.severity} (Likelihood ${r.likelihood_score}/5, Impact ${r.impact_score}/5) - ${r.description || ""}`,
          )
          .join("\n")
      : "No custom rules provided. Use domain standard risk evaluation thresholds.";

  return `
You are the Chief Risk Officer Intelligence Agent for the Enterprise Risk Intelligence and Decision Support System (ERIDSS).
Your task is to analyze the provided borrower or single business client document for ${targetDetails} and extract factual data, evidence, repayment mitigants, and candidate credit risks strictly across the configured single client categories and deterministic rules:

=== ACTIVE SINGLE CLIENT CREDIT CATEGORIES & WEIGHTS ===
${categoriesListText}

=== DETERMINISTIC SINGLE CLIENT CREDIT RULES ===
The configured rules establish the following borrower and repayment threshold criteria to monitor:
${rulesListText}

RULES:
- Extract ONLY what is supported by the document and client profile. Do NOT invent facts or figures.
- Check document facts against the configured rules, especially income, disposable cash flow, debt burden, affordability, repayment behavior, collateral, guarantees, and data quality.
- If information for a category or control is missing, mark data sufficiency as "INSUFFICIENT_DATA".
- For every candidate risk, provide traceable evidence from the document (verbatim text quote and approximate page/sheet/section).
- Provide initial baseline estimates for likelihood (1 to 5) and impact (1 to 5) based solely on documented borrower evidence and configured rules.
- Extract these facts when present: verified income, average inflows and outflows, disposable income, proposed amount and installment, existing obligations, debt service ratio, arrears, late payments, income volatility, employment or business duration, collateral value and ownership, guarantee strength, and document inconsistencies.

DOCUMENT CONTENT:
"""
${documentText.slice(0, 50000)}
"""

Respond STRICTLY with valid JSON following this exact schema:
{
  "document_summary": "Concise summary of document scope and subject context (2-3 sentences)",
  "extracted_facts": [
    {
      "category_code": ${validCategoryCodes},
      "fact_key": "Descriptive key (e.g. Debt Service Ratio, Monthly Disposable Income, Late Payment Count, Collateral Coverage Ratio)",
      "fact_value": "The extracted value string",
      "numerical_value": number or null,
      "raw_evidence_text": "Verbatim quote or sentence from document",
      "source_location": "Page / Sheet / Section reference if identifiable, else 'Section: Executive/Data'",
      "confidence": number between 0.70 and 1.00
    }
  ],
  "candidate_risks": [
    {
      "category_code": ${validCategoryCodes},
      "risk_name": "Clear professional risk title matching Risk Officer factor if applicable",
      "risk_description": "Detailed explanation of the risk mechanism and why it matters",
      "suggested_likelihood": number between 1 and 5,
      "suggested_impact": number between 1 and 5,
      "evidence_quote": "Exact verbatim excerpt from the document demonstrating this risk",
      "source_location": "Page / Sheet / Section reference",
      "controls_identified": [
        {
          "control_name": "Name of repayment mitigant mentioned (e.g. Collateral, Guarantor, Credit Insurance, Salary Assignment)",
          "control_type": "PREVENTATIVE" | "DETECTIVE" | "CORRECTIVE" | "COMPENSATING",
          "effectiveness_pct": number between 0 and 100,
          "status": "EVALUATED" | "INSUFFICIENT_DATA" | "DEFICIENT",
          "evidence": "Mention of control in document"
        }
      ],
      "confidence": "High" | "Medium" | "Low"
    }
  ]
}
`;
}

/**
 * Prompt for Step 2: Post-Calculation Risk Intelligence & Recommendations
 */
function buildPostCalculationIntelligencePrompt(assessmentContext) {
  const {
    targetProfile,
    organization,
    extractedFacts,
    calculatedRisks,
    categoryScores,
    eriResult,
  } = assessmentContext;

  const targetLabel = "Single Client Credit Assessment (Anonymized)";

  return `
You are the Senior Risk Intelligence AI for ERIDSS.
The deterministic backend risk engine has completed the mathematical calculations for ${targetLabel}.
Here are the official calculated scores and extracted facts:

=== CLIENT RISK INDEX (NORMALIZED 0 TO 100) ===
Final Risk Index Score: ${eriResult.eriScore} / 100 (${eriResult.classification})
Category Breakdown (Weighted per Single Client Configuration):
${JSON.stringify(eriResult.categoryBreakdown, null, 2)}

=== DETERMINISTICALLY CALCULATED RISKS ===
${JSON.stringify(calculatedRisks, null, 2)}

=== EXTRACTED BORROWER & CLIENT FACTS ===
${JSON.stringify(extractedFacts.slice(0, 30), null, 2)}

TASK:
1. Generate an Executive Summary (150-250 words) suitable for the Risk Officer and Decision Desk explaining the repayment risk stance of ${targetLabel}.
2. Provide a Risk Position Overview analyzing affordability, debt burden, income stability, repayment behavior, collateral or guarantee coverage, and data quality.
3. Identify the Top Risk Drivers directly linked to extracted borrower evidence and triggered deterministic rules.
4. Explain the consequences for repayment if high-severity risks remain unaddressed, without inventing an approval decision or facts not present in the document.
5. Formulate actionable credit risk mitigation recommendations prioritized into:
   - IMMEDIATE (0 - 30 days)
   - SHORT_TERM (1 - 3 months)
   - MEDIUM_TERM (3 - 6 months)
   Each recommendation must specify:
   - Clear title
   - Actionable implementation steps
   - Associated risk name
   - Priority (IMMEDIATE, SHORT_TERM, MEDIUM_TERM)
   - Suggested timeframe
   - Expected measurable outcome

Respond STRICTLY with valid JSON following this exact schema:
{
  "executive_summary": "High-level professional executive summary text",
  "risk_position_overview": "Comprehensive assessment of resilience and exposure",
  "top_risk_drivers": [
    {
      "driver_title": "Title of driver",
      "category": "String category code",
      "impact_summary": "Why this driver is elevating the client risk index or weakening repayment capacity",
      "supporting_evidence": "Specific evidence citation"
    }
  ],
  "strategic_implications": "Analytical projection of vulnerabilities and consequences",
  "recommendations": [
    {
      "title": "Clear action-oriented title",
      "risk_name": "Associated identified risk title",
      "recommendation_text": "Concrete steps to mitigate this borrower repayment vulnerability",
      "priority": "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM",
      "suggested_timeframe": "e.g. 14 days, 30 days, 60 days",
      "expected_outcome": "Measurable reduction in likelihood or impact"
    }
  ]
}
`;
}

/**
 * Prompt for Step 3: Grounded AI Risk Advisor Contextual Q&A
 */
function buildAdvisorGroundedPrompt(
  question,
  assessmentSummary,
  chatHistory = [],
) {
  const scoresText = (assessmentSummary?.categoryScores || [])
    .map(
      (c) =>
        `• ${c.category_name || c.category_code}: Score ${Number(c.category_score).toFixed(1)}/100 (Weight ${c.category_weight}%)`,
    )
    .join("\n");

  const risksText = (assessmentSummary?.identifiedRisks || [])
    .slice(0, 10)
    .map(
      (r) =>
        `• [${r.category}] ${r.name}: Residual Risk ${Number(r.residualRisk).toFixed(1)} (${r.classification}), Inherent ${r.inherentRisk} (Likelihood: ${r.likelihood}/5, Impact: ${r.impact}/5), Control Effectiveness: ${r.controlEffectiveness}% - ${r.description}`,
    )
    .join("\n");

  const recsText = (assessmentSummary?.recommendations || [])
    .slice(0, 5)
    .map(
      (rec) => `• [${rec.priority}] ${rec.title}: ${rec.recommendation_text}`,
    )
    .join("\n");

  return `
ASSESSMENT CONTEXT:
Institution: ${assessmentSummary?.organization?.name || "Institution"} (${assessmentSummary?.organization?.industry || "Credit Services"})
Client Risk Index: ${Number(assessmentSummary?.assessment?.overallERI || 0).toFixed(1)} / 100 (${assessmentSummary?.assessment?.classification || "Moderate"})
Document Scope: ${assessmentSummary?.assessment?.summary || "Single client credit assessment"}

Category Breakdown:
${scoresText || "No category scores"}

Identified Risks:
${risksText || "No identified risks"}

Remediation Actions:
${recsText || "No recommendations"}

RECENT CONVERSATION:
${chatHistory
  .slice(-4)
  .map((m) => `${m.role === "user" ? "Risk Officer" : "Advisor"}: ${m.content}`)
  .join("\n")}

USER QUESTION:
${question}
`;
}

module.exports = {
  buildDocumentExtractionPrompt,
  buildPostCalculationIntelligencePrompt,
  buildAdvisorGroundedPrompt,
};
