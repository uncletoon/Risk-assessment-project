// ============================================================================
// ERIDSS Risk Constants & Scale Definitions
// ============================================================================

const RISK_CATEGORIES = {
  REPAYMENT_CAPACITY: {
    code: "REPAYMENT_CAPACITY",
    name: "Repayment Capacity & Affordability",
    defaultWeight: 30.0,
    description:
      "Ability to meet the proposed repayment from verified disposable income and recurring cash flow.",
  },
  DEBT_BURDEN: {
    code: "DEBT_BURDEN",
    name: "Existing Debt & Leverage",
    defaultWeight: 20.0,
    description:
      "Existing obligations, leverage, debt service burden, and available borrowing headroom.",
  },
  INCOME_STABILITY: {
    code: "INCOME_STABILITY",
    name: "Income & Cash Flow Stability",
    defaultWeight: 15.0,
    description:
      "Consistency, source quality, volatility, and sustainability of income or business cash flow.",
  },
  CREDIT_BEHAVIOR: {
    code: "CREDIT_BEHAVIOR",
    name: "Credit & Repayment Behavior",
    defaultWeight: 15.0,
    description:
      "Previous repayment conduct, arrears, missed payments, account behavior, and credit history.",
  },
  COLLATERAL_GUARANTEE: {
    code: "COLLATERAL_GUARANTEE",
    name: "Collateral & Guarantee Coverage",
    defaultWeight: 10.0,
    description:
      "Quality, ownership, enforceability, valuation, and coverage provided by collateral or guarantees.",
  },
  KYC_DATA_QUALITY: {
    code: "KYC_DATA_QUALITY",
    name: "KYC, Fraud & Data Quality",
    defaultWeight: 10.0,
    description:
      "Identity consistency, document reliability, missing information, contradictions, and fraud indicators.",
  },
};

const LIKELIHOOD_SCALE = {
  1: {
    level: 1,
    label: "Rare",
    description: "Highly unlikely to occur (< 5% probability in 12 months)",
  },
  2: {
    level: 2,
    label: "Unlikely",
    description: "Low probability of occurrence (5% - 25%)",
  },
  3: {
    level: 3,
    label: "Possible",
    description: "Moderate probability of occurrence (25% - 50%)",
  },
  4: {
    level: 4,
    label: "Likely",
    description: "High probability of occurrence (50% - 75%)",
  },
  5: {
    level: 5,
    label: "Almost Certain",
    description: "Expected to occur (> 75% probability in 12 months)",
  },
};

const IMPACT_SCALE = {
  1: {
    level: 1,
    label: "Insignificant",
    description:
      "Negligible operational or financial impact (< 1% operating margin)",
  },
  2: {
    level: 2,
    label: "Minor",
    description: "Manageable disruption with minor cost impact (1% - 5%)",
  },
  3: {
    level: 3,
    label: "Moderate",
    description: "Material impact requiring tactical adjustments (5% - 15%)",
  },
  4: {
    level: 4,
    label: "Major",
    description:
      "Severe disruption to operations, solvency, or regulatory standing (15% - 30%)",
  },
  5: {
    level: 5,
    label: "Severe",
    description:
      "Catastrophic threat to enterprise survival or business continuity (> 30%)",
  },
};

// Inherent Risk = Likelihood (1-5) * Impact (1-5) => [1 to 25]
function getInherentClassification(score) {
  if (score <= 4) return "Very Low";
  if (score <= 9) return "Low";
  if (score <= 14) return "Moderate";
  if (score <= 19) return "High";
  return "Critical";
}

// Normalized risk index scale: [0 to 100]
function getERIClassification(eriScore) {
  if (eriScore <= 20) return "Very Low";
  if (eriScore <= 40) return "Low";
  if (eriScore <= 60) return "Moderate";
  if (eriScore <= 80) return "High";
  return "Critical";
}

const ASSESSMENT_STATUSES = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  EXTRACTING: "EXTRACTING",
  ASSESSING: "ASSESSING",
  ANALYZING: "ANALYZING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
};

const MITIGATION_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const MITIGATION_PRIORITIES = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

module.exports = {
  RISK_CATEGORIES,
  LIKELIHOOD_SCALE,
  IMPACT_SCALE,
  getInherentClassification,
  getERIClassification,
  ASSESSMENT_STATUSES,
  MITIGATION_STATUSES,
  MITIGATION_PRIORITIES,
};
