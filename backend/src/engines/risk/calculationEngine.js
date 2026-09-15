// ============================================================================
// Deterministic Risk Calculation Engine with Explainability & Dynamic Methodology
// Implements mathematical risk scoring, control evaluation, residual risk,
// category index aggregation, Enterprise Risk Index (ERI), and what-if simulation.
// ============================================================================

const {
  getInherentClassification,
  getERIClassification,
  RISK_CATEGORIES,
} = require("../../constants/riskConstants");

/**
 * Helper to match a score against custom score bands or fall back to default classification
 * @param {number} score
 * @param {Array<{ name: string, min_score: number, max_score: number }>} bands
 * @param {Function} fallbackFn
 * @returns {string}
 */
function classifyWithMethodology(score, bands, fallbackFn) {
  if (bands && Array.isArray(bands) && bands.length > 0) {
    const matched = bands.find(
      (b) => score >= Number(b.min_score) && score <= Number(b.max_score),
    );
    if (matched) return matched.name;
  }
  return fallbackFn(score);
}

/**
 * Calculates inherent risk deterministically from likelihood and impact
 * Supports dynamic matrix dimension N (default 5, e.g. 3x3, 4x4, 5x5)
 * @param {number} likelihood Scale 1 to N
 * @param {number} impact Scale 1 to N
 * @param {object} methodology Optional methodology config or snapshot
 * @returns {{ likelihood: number, impact: number, inherentRisk: number, normalizedInherentRisk: number, matrixDimension: number, classification: string, explanation: string }}
 */
function calculateInherentRisk(likelihood, impact, methodology = null) {
  const dimension = Math.max(
    3,
    Math.min(5, Number(methodology?.matrix_dimension) || 5),
  );
  const maxInherent = dimension * dimension;

  const l = Math.max(
    1,
    Math.min(
      dimension,
      Math.round(Number(likelihood) || Math.ceil(dimension / 2)),
    ),
  );
  const i = Math.max(
    1,
    Math.min(dimension, Math.round(Number(impact) || Math.ceil(dimension / 2))),
  );
  const rawInherent = l * i;

  // Normalized to 0 to 100 scale
  const normalizedInherent =
    Math.round((rawInherent / maxInherent) * 100 * 100) / 100;

  // Determine classification
  const classification = classifyWithMethodology(
    rawInherent,
    methodology?.score_bands,
    getInherentClassification,
  );

  const explanation = `Inherent Risk: ${rawInherent} / ${maxInherent} (Likelihood: ${l} × Impact: ${i} on a ${dimension}×${dimension} matrix, normalized: ${normalizedInherent}/100, classified as ${classification}).`;

  return {
    likelihood: l,
    impact: i,
    inherentRisk: rawInherent,
    normalizedInherentRisk: normalizedInherent,
    matrixDimension: dimension,
    classification,
    explanation,
  };
}

/**
 * Evaluates internal controls and computes overall control effectiveness percentage
 * @param {Array<{ control_name: string, effectiveness_pct?: number, status?: string }>} controls
 * @returns {{ effectivenessPct: number, status: 'EVALUATED' | 'INSUFFICIENT_DATA', evaluatedCount: number, controlBreakdown: Array }}
 */
function evaluateControlEffectiveness(controls) {
  if (!controls || !Array.isArray(controls) || controls.length === 0) {
    return {
      effectivenessPct: 0.0,
      status: "INSUFFICIENT_DATA",
      evaluatedCount: 0,
      controlBreakdown: [],
    };
  }

  const validControls = controls.filter(
    (c) =>
      c &&
      typeof c.effectiveness_pct === "number" &&
      !isNaN(c.effectiveness_pct) &&
      c.status !== "INSUFFICIENT_DATA",
  );

  if (validControls.length === 0) {
    return {
      effectivenessPct: 0.0,
      status: "INSUFFICIENT_DATA",
      evaluatedCount: 0,
      controlBreakdown: [],
    };
  }

  // Arithmetic average of control effectiveness
  const total = validControls.reduce(
    (sum, c) => sum + Math.max(0, Math.min(100, c.effectiveness_pct)),
    0,
  );
  const avg = Math.round((total / validControls.length) * 100) / 100;

  const controlBreakdown = validControls.map((c) => ({
    name: c.control_name || "Unnamed Control",
    effectiveness: Math.max(0, Math.min(100, c.effectiveness_pct)),
  }));

  return {
    effectivenessPct: avg,
    status: "EVALUATED",
    evaluatedCount: validControls.length,
    controlBreakdown,
  };
}

/**
 * Calculates residual risk from inherent risk and control effectiveness with full plain language explainability
 * Formula: Residual Risk = Inherent Risk * (1 - (Control Effectiveness / 100))
 * @param {number} inherentRisk 1 to N^2 (or normalized 0 to 100)
 * @param {number} controlEffectivenessPct 0 to 100
 * @param {string} controlStatus 'EVALUATED' | 'INSUFFICIENT_DATA'
 * @param {object} methodology Optional methodology config or snapshot
 * @param {Array} controls Optional control array for detailed breakdown
 * @returns {{ residualRisk: number, normalizedResidualRisk: number, classification: string, controlEffectivenessPct: number, controlStatus: string, controlDeduction: number, explanation: string }}
 */
function calculateResidualRisk(
  inherentRisk,
  controlEffectivenessPct = 0,
  controlStatus = "EVALUATED",
  methodology = null,
  controls = [],
) {
  const dimension = Math.max(
    3,
    Math.min(5, Number(methodology?.matrix_dimension) || 5),
  );
  const maxInherent = dimension * dimension;
  const rawInh = Math.max(1, Math.min(100, Number(inherentRisk) || 1));

  let eff = Math.max(0, Math.min(100, Number(controlEffectivenessPct) || 0));
  if (controlStatus === "INSUFFICIENT_DATA") {
    eff = 0.0;
  }

  const factor = 1.0 - eff / 100.0;
  const rawResidual = rawInh * factor;
  const residualRisk = Math.round(rawResidual * 100) / 100;
  const controlDeduction = Math.round((rawInh - residualRisk) * 100) / 100;

  // Normalized residual score (0 to 100)
  const normalizedResidual =
    rawInh <= maxInherent
      ? Math.round((residualRisk / maxInherent) * 100 * 100) / 100
      : residualRisk;

  // Determine classification using score bands if provided, else standard classification
  const classification = classifyWithMethodology(
    residualRisk,
    methodology?.score_bands,
    getInherentClassification,
  );

  // Build human readable explanation narrative with inline mathematical steps
  let controlNarrative = "No active controls evaluated (0.0% reduction)";
  if (eff > 0) {
    if (controls && controls.length > 0) {
      const names = controls
        .filter((c) => c.effectiveness_pct > 0)
        .map((c) => `${c.control_name || "Control"}: ${c.effectiveness_pct}%`)
        .join(", ");
      controlNarrative = `Controls (${names || "Evaluated"}) provide ${eff}% total effectiveness`;
    } else {
      controlNarrative = `Evaluated controls provide ${eff}% effectiveness`;
    }
  }

  const explanation = `Inherent Risk: ${rawInh}. ${controlNarrative}, reducing risk score by ${eff}% (-${controlDeduction} points). Residual Risk: ${residualRisk} (${classification}). Mathematical Formula: ${rawInh} × (1 - ${eff / 100}) = ${residualRisk}.`;

  return {
    residualRisk,
    normalizedResidualRisk: normalizedResidual,
    classification,
    controlEffectivenessPct: eff,
    controlStatus,
    controlDeduction,
    explanation,
  };
}

/**
 * Calculates normalized category risk scores (0 to 100) from list of risks
 * @param {Array<{ category_code: string, residual_risk: number }>} identifiedRisks
 * @param {Array<{ code: string, default_weight: number }> | object} categoriesConfigOrMethodology
 * @returns {Record<string, { categoryCode: string, categoryName: string, categoryScore: number, weight: number, weightedScore: number, riskCount: number, risks: Array }>}
 */
function calculateCategoryScores(
  identifiedRisks,
  categoriesConfigOrMethodology = null,
) {
  let categories = [];
  let customWeights = {};

  if (categoriesConfigOrMethodology?.category_weights) {
    customWeights = categoriesConfigOrMethodology.category_weights;
  }

  if (Array.isArray(categoriesConfigOrMethodology)) {
    categories = categoriesConfigOrMethodology;
  } else {
    categories = Object.values(RISK_CATEGORIES).map((c) => ({
      code: c.code,
      name: c.name,
      default_weight:
        customWeights[c.code] !== undefined
          ? customWeights[c.code]
          : c.defaultWeight,
    }));
  }

  const categoryMap = {};
  for (const cat of categories) {
    const weight =
      customWeights[cat.code] !== undefined
        ? Number(customWeights[cat.code])
        : Number(cat.default_weight || cat.defaultWeight || 16.67);

    categoryMap[cat.code] = {
      categoryCode: cat.code,
      categoryName: cat.name || cat.code,
      categoryScore: 0.0,
      weight,
      weightedScore: 0.0,
      riskCount: 0,
      risks: [],
    };
  }

  // Group risks by category
  for (const risk of identifiedRisks || []) {
    const code = (risk.category_code || risk.categoryCode || "").toUpperCase();
    if (categoryMap[code]) {
      categoryMap[code].risks.push(risk);
      categoryMap[code].riskCount += 1;
    }
  }

  // Calculate score for each category
  // Formula: Category Score (0-100) = (Average Residual Risk / 25) * 100
  for (const code of Object.keys(categoryMap)) {
    const cat = categoryMap[code];
    if (cat.risks.length > 0) {
      const sumResidual = cat.risks.reduce(
        (sum, r) => sum + (Number(r.residual_risk || r.residualRisk) || 0),
        0,
      );
      const avgResidual = sumResidual / cat.risks.length;
      // Normalize from 0-25 scale to 0-100
      const normalizedScore = Math.min(
        100,
        Math.round((avgResidual / 25.0) * 100 * 100) / 100,
      );
      cat.categoryScore = normalizedScore;
    } else {
      cat.categoryScore = 0.0;
    }
    cat.weightedScore =
      Math.round(cat.categoryScore * (cat.weight / 100.0) * 100) / 100;
  }

  return categoryMap;
}

/**
 * Calculates Enterprise Risk Index (ERI) from category scores and weights with narrative summary
 * Formula: ERI = Sum(Category Score_i * Weight_i) / Sum(Weight_i)
 * @param {Record<string, { categoryScore: number, weight: number, riskCount?: number, categoryName?: string }>} categoryScores
 * @param {object} methodology Optional methodology config or snapshot
 * @returns {{ eriScore: number, classification: string, totalWeight: number, categoryBreakdown: Array, explanation: string }}
 */
function calculateEnterpriseRiskIndex(categoryScores, methodology = null) {
  let weightedSum = 0;
  let totalWeight = 0;
  let totalRisks = 0;
  const breakdown = [];

  for (const key of Object.keys(categoryScores)) {
    const item = categoryScores[key];
    const score = Number(item.categoryScore) || 0;
    const weight = Number(item.weight) || 0;
    const rCount = Number(item.riskCount) || 0;
    totalRisks += rCount;

    weightedSum += score * weight;
    totalWeight += weight;

    breakdown.push({
      categoryCode: item.categoryCode || key,
      categoryName: item.categoryName || key,
      categoryScore: score,
      weight,
      weightedContribution: Math.round(score * (weight / 100) * 100) / 100,
      riskCount: rCount,
    });
  }

  const finalERI =
    totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;

  // Determine classification
  const classification = classifyWithMethodology(
    finalERI,
    methodology?.score_bands,
    getERIClassification,
  );

  // Identify top category contributors
  const sortedContributors = [...breakdown]
    .filter((b) => b.weightedContribution > 0)
    .sort((a, b) => b.weightedContribution - a.weightedContribution);

  const topContributorsText =
    sortedContributors.length > 0
      ? sortedContributors
          .slice(0, 3)
          .map((c) => `${c.categoryName} (${c.weightedContribution} pts)`)
          .join(", ")
      : "No active risk contributions";

  const assessedCount = breakdown.filter((b) => b.riskCount > 0).length;

  const explanation = `Enterprise Risk Index: ${finalERI} / 100 (${classification}), derived across ${assessedCount} active categories totaling ${totalRisks} identified risks (total weight evaluated: ${Math.round(totalWeight * 100) / 100}%). Top risk contributors: ${topContributorsText}. Formula: Σ(Category Score × Weight) / Σ(Weights) = ${finalERI}.`;

  return {
    eriScore: finalERI,
    classification,
    totalWeight: Math.round(totalWeight * 100) / 100,
    categoryBreakdown: breakdown,
    explanation,
  };
}

/**
 * Simulates proposed mitigation actions on a risk without persisting changes
 * @param {object} params
 * @param {number} params.inherentRisk
 * @param {number} [params.currentResidual]
 * @param {Array<{ control_name: string, effectiveness_pct: number }>} params.proposedControls
 * @param {object} [params.methodology]
 * @returns {{ inherentRisk: number, currentResidual: number, projectedResidual: number, projectedClassification: string, deltaPoints: number, reductionPercentage: number, effectiveControlPct: number, explanation: string }}
 */
function simulateMitigationImpact({
  inherentRisk,
  currentResidual = null,
  proposedControls = [],
  methodology = null,
}) {
  const inh = Number(inherentRisk) || 20;
  const initialResidual =
    currentResidual !== null && currentResidual !== undefined
      ? Number(currentResidual)
      : inh;

  const evalResult = evaluateControlEffectiveness(proposedControls);
  const effPct = evalResult.effectivenessPct;

  const residualResult = calculateResidualRisk(
    inh,
    effPct,
    evalResult.status,
    methodology,
    proposedControls,
  );
  const projectedResidual = residualResult.residualRisk;
  const deltaPoints =
    Math.round((initialResidual - projectedResidual) * 100) / 100;
  const reductionPercentage =
    initialResidual > 0
      ? Math.round((deltaPoints / initialResidual) * 100 * 100) / 100
      : 0;

  const explanation = `Simulation Result: Introducing proposed controls (${evalResult.controlBreakdown.map((c) => `${c.name}: ${c.effectiveness}%`).join(", ") || "None"}) achieves ${effPct}% control effectiveness. Projected residual risk decreases from ${initialResidual} to ${projectedResidual} (${residualResult.classification}), lowering score by ${deltaPoints} points (${reductionPercentage}% reduction).`;

  return {
    inherentRisk: inh,
    currentResidual: initialResidual,
    projectedResidual,
    projectedClassification: residualResult.classification,
    deltaPoints,
    reductionPercentage,
    effectiveControlPct: effPct,
    explanation,
  };
}

module.exports = {
  calculateInherentRisk,
  evaluateControlEffectiveness,
  calculateResidualRisk,
  calculateCategoryScores,
  calculateEnterpriseRiskIndex,
  simulateMitigationImpact,
};
