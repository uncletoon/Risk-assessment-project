// ============================================================================
// Deterministic Risk Rule Engine
// Evaluates extracted document evidence and facts against configurable DB rules
// ============================================================================

const { pool } = require("../../config/db");

/**
 * Extracts a numeric value from string (e.g. "87%", "$1,200,000", "2.8x", "48 hours")
 */
function parseNumeric(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const str = String(val).trim().replace(/,/g, "");
  const match = str.match(/[-+]?[0-9]*\.?[0-9]+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Evaluates a single condition
 */
function evaluateCondition(operator, factValue, thresholdValue, numericalFact) {
  const normFact = String(factValue || "")
    .toLowerCase()
    .trim();
  const normThresh = String(thresholdValue || "")
    .toLowerCase()
    .trim();

  const factNum =
    numericalFact !== null && numericalFact !== undefined
      ? numericalFact
      : parseNumeric(factValue);
  const threshNum = parseNumeric(thresholdValue);

  switch (operator.toUpperCase()) {
    case "GT":
      if (factNum !== null && threshNum !== null) return factNum > threshNum;
      return false;
    case "GTE":
      if (factNum !== null && threshNum !== null) return factNum >= threshNum;
      return false;
    case "LT":
      if (factNum !== null && threshNum !== null) return factNum < threshNum;
      return false;
    case "LTE":
      if (factNum !== null && threshNum !== null) return factNum <= threshNum;
      return false;
    case "EQ":
      if (factNum !== null && threshNum !== null)
        return Math.abs(factNum - threshNum) < 0.0001;
      return normFact === normThresh;
    case "CONTAINS":
      return normFact.includes(normThresh);
    case "RANGE": {
      // Expect threshold format: "min..max" or "min-max"
      const parts = normThresh.split(/\.\.|-/).map((p) => parseNumeric(p));
      if (
        parts.length === 2 &&
        parts[0] !== null &&
        parts[1] !== null &&
        factNum !== null
      ) {
        return factNum >= parts[0] && factNum <= parts[1];
      }
      return false;
    }
    default:
      return false;
  }
}

/**
 * Loads active rules from PostgreSQL, optionally filtered by rule group
 */
async function getActiveRules(ruleGroupId = null) {
  try {
    if (ruleGroupId) {
      const res = await pool.query(
        "SELECT * FROM risk_rules WHERE is_active = true AND rule_group_id = $1 ORDER BY category_code ASC, id ASC",
        [ruleGroupId],
      );
      if (res.rows.length > 0) {
        return res.rows;
      }
    }
    const res = await pool.query(
      "SELECT * FROM risk_rules WHERE is_active = true ORDER BY category_code ASC, id ASC",
    );
    return res.rows;
  } catch (err) {
    console.error("Error fetching active risk rules:", err.message);
    return [];
  }
}

/**
 * Evaluates extracted facts against active business rules
 * @param {Array<{ category_code: string, fact_key: string, fact_value: string, numerical_value?: number, raw_evidence_text?: string }>} facts
 * @param {Array<object>} customRules Optional override rules
 * @returns {Promise<Array<{ rule: object, matchedFact: object, likelihood: number, impact: number }>>}
 */
async function evaluateFactsAgainstRules(facts, customRules = null) {
  const rules = customRules || (await getActiveRules());
  const matchedRules = [];

  for (const rule of rules) {
    for (const fact of facts) {
      // Match category or generic factor
      const categoryMatch =
        !rule.category_code || rule.category_code === fact.category_code;
      const keyOrText =
        `${fact.fact_key} ${fact.fact_value} ${fact.raw_evidence_text || ""}`.toLowerCase();
      const factorMatch = keyOrText.includes(rule.factor_name.toLowerCase());

      if (categoryMatch && factorMatch) {
        const isTriggered = evaluateCondition(
          rule.condition_operator,
          fact.fact_value,
          rule.threshold_value,
          fact.numerical_value,
        );

        if (isTriggered) {
          matchedRules.push({
            ruleId: rule.id,
            categoryCode: rule.category_code,
            factorName: rule.factor_name,
            severity: rule.severity,
            description: rule.description,
            likelihoodScore: rule.likelihood_score,
            impactScore: rule.impact_score,
            matchedFactKey: fact.fact_key,
            matchedFactValue: fact.fact_value,
            evidence: fact.raw_evidence_text || fact.fact_value,
          });
          break; // Avoid duplicating same rule for same fact
        }
      }
    }
  }

  return matchedRules;
}

module.exports = {
  parseNumeric,
  evaluateCondition,
  getActiveRules,
  evaluateFactsAgainstRules,
};
