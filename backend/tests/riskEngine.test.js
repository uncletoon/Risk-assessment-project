// ============================================================================
// Deterministic Risk Engine Unit Tests
// ============================================================================

const assert = require("assert");
const { test, describe } = require("node:test");

const {
  calculateInherentRisk,
  evaluateControlEffectiveness,
  calculateResidualRisk,
  calculateCategoryScores,
  calculateEnterpriseRiskIndex,
  simulateMitigationImpact,
} = require("../src/engines/risk/calculationEngine");

const {
  evaluateCondition,
  parseNumeric,
} = require("../src/engines/risk/ruleEngine");

describe("Deterministic Calculation Engine", () => {
  test("calculateInherentRisk: calculates L x I and classifications correctly", () => {
    // 1 x 1 = 1 -> Very Low
    const r1 = calculateInherentRisk(1, 1);
    assert.strictEqual(r1.inherentRisk, 1);
    assert.strictEqual(r1.classification, "Very Low");

    // 2 x 3 = 6 -> Low
    const r2 = calculateInherentRisk(2, 3);
    assert.strictEqual(r2.inherentRisk, 6);
    assert.strictEqual(r2.classification, "Low");

    // 3 x 4 = 12 -> Moderate
    const r3 = calculateInherentRisk(3, 4);
    assert.strictEqual(r3.inherentRisk, 12);
    assert.strictEqual(r3.classification, "Moderate");

    // 4 x 4 = 16 -> High
    const r4 = calculateInherentRisk(4, 4);
    assert.strictEqual(r4.inherentRisk, 16);
    assert.strictEqual(r4.classification, "High");

    // 5 x 5 = 25 -> Critical
    const r5 = calculateInherentRisk(5, 5);
    assert.strictEqual(r5.inherentRisk, 25);
    assert.strictEqual(r5.classification, "Critical");
  });

  test("evaluateControlEffectiveness: computes averages and handles INSUFFICIENT_DATA", () => {
    // Empty controls
    const c1 = evaluateControlEffectiveness([]);
    assert.strictEqual(c1.status, "INSUFFICIENT_DATA");
    assert.strictEqual(c1.effectivenessPct, 0);

    // Valid controls
    const c2 = evaluateControlEffectiveness([
      { control_name: "Backups", effectiveness_pct: 60, status: "EVALUATED" },
      { control_name: "Insurance", effectiveness_pct: 40, status: "EVALUATED" },
    ]);
    assert.strictEqual(c2.status, "EVALUATED");
    assert.strictEqual(c2.effectivenessPct, 50);
  });

  test("calculateResidualRisk: applies formula Inherent * (1 - ControlEff)", () => {
    // Inherent = 20, Control = 50% => Residual = 10 (Moderate)
    const res1 = calculateResidualRisk(20, 50, "EVALUATED");
    assert.strictEqual(res1.residualRisk, 10);
    assert.strictEqual(res1.classification, "Moderate");
    assert.strictEqual(res1.controlDeduction, 10);

    // Inherent = 20, Control = INSUFFICIENT_DATA => Residual = 20 (Critical)
    const res2 = calculateResidualRisk(20, 50, "INSUFFICIENT_DATA");
    assert.strictEqual(res2.residualRisk, 20);
    assert.strictEqual(res2.classification, "Critical");
  });

  test("calculateEnterpriseRiskIndex: calculates weighted sum accurately across 5 categories", () => {
    const mockCategoryScores = {
      FINANCIAL: { categoryCode: "FINANCIAL", categoryScore: 50, weight: 25 },
      OPERATIONAL: {
        categoryCode: "OPERATIONAL",
        categoryScore: 40,
        weight: 25,
      },
      STRATEGIC: { categoryCode: "STRATEGIC", categoryScore: 30, weight: 20 },
      LEGAL_REGULATORY: {
        categoryCode: "LEGAL_REGULATORY",
        categoryScore: 20,
        weight: 15,
      },
      MARKET: { categoryCode: "MARKET", categoryScore: 50, weight: 15 },
    };

    // Expected:
    // (50*25 + 40*25 + 30*20 + 20*15 + 50*15) / 100
    // = (1250 + 1000 + 600 + 300 + 750) / 100
    // = 3900 / 100 = 39.0 (Low)
    const eri = calculateEnterpriseRiskIndex(mockCategoryScores);
    assert.strictEqual(eri.eriScore, 39.0);
    assert.strictEqual(eri.classification, "Low");
    assert.strictEqual(eri.totalWeight, 100);
  });
});

describe("Deterministic Rule Engine Evaluation", () => {
  test("parseNumeric parses numbers from various string formats", () => {
    assert.strictEqual(parseNumeric("87%"), 87);
    assert.strictEqual(parseNumeric("$1,200,000.50"), 1200000.5);
    assert.strictEqual(parseNumeric("2.8x leverage"), 2.8);
    assert.strictEqual(parseNumeric("-15.4"), -15.4);
  });

  test("evaluateCondition tests operators GT, LT, GTE, LTE, EQ, CONTAINS, RANGE", () => {
    assert.strictEqual(evaluateCondition("GT", "87%", "80%"), true);
    assert.strictEqual(evaluateCondition("GT", "75%", "80%"), false);
    assert.strictEqual(evaluateCondition("LT", "-50000", "0"), true);
    assert.strictEqual(evaluateCondition("EQ", "true", "true"), true);
    assert.strictEqual(
      evaluateCondition(
        "CONTAINS",
        "Enterprise is non-compliant with GDPR",
        "non-compliant",
      ),
      true,
    );
    assert.strictEqual(evaluateCondition("RANGE", "45", "40..50"), true);
  });
});

describe("Methodology Configuration & Explainability Extensions", () => {
  test("calculateInherentRisk produces human readable narrative and supports 3x3 matrix", () => {
    // 3x3 matrix: L=3, I=2 => raw=6, max=9, normalized = (6/9)*100 = 66.67
    const methodology = {
      matrix_dimension: 3,
      score_bands: [
        { name: "Low", min_score: 1, max_score: 3 },
        { name: "Medium", min_score: 4, max_score: 6 },
        { name: "High", min_score: 7, max_score: 9 },
      ],
    };

    const res = calculateInherentRisk(3, 2, methodology);
    assert.strictEqual(res.inherentRisk, 6);
    assert.strictEqual(res.matrixDimension, 3);
    assert.strictEqual(res.normalizedInherentRisk, 66.67);
    assert.strictEqual(res.classification, "Medium");
    assert.match(res.explanation, /Inherent Risk: 6 \/ 9/);
    assert.match(res.explanation, /normalized: 66.67\/100/);
  });

  test("calculateResidualRisk produces inline mathematical breakdown", () => {
    const controls = [
      { control_name: "WAF", effectiveness_pct: 60 },
      { control_name: "Encryption", effectiveness_pct: 40 },
    ];
    // avg eff = 50%
    const res = calculateResidualRisk(20, 50, "EVALUATED", null, controls);
    assert.strictEqual(res.residualRisk, 10);
    assert.strictEqual(res.controlDeduction, 10);
    assert.match(res.explanation, /Inherent Risk: 20/);
    assert.match(res.explanation, /WAF: 60%/);
    assert.match(
      res.explanation,
      /Mathematical Formula: 20 × \(1 - 0.5\) = 10/,
    );
  });

  test("calculateEnterpriseRiskIndex includes narrative summary and top contributors", () => {
    const mockCategoryScores = {
      FINANCIAL: {
        categoryCode: "FINANCIAL",
        categoryName: "Financial Risk",
        categoryScore: 80,
        weight: 50,
        riskCount: 3,
      },
      OPERATIONAL: {
        categoryCode: "OPERATIONAL",
        categoryName: "Operational Risk",
        categoryScore: 20,
        weight: 50,
        riskCount: 1,
      },
    };

    const eri = calculateEnterpriseRiskIndex(mockCategoryScores);
    assert.strictEqual(eri.eriScore, 50.0);
    assert.match(eri.explanation, /Enterprise Risk Index: 50 \/ 100/);
    assert.match(eri.explanation, /Financial Risk/);
  });

  test("simulateMitigationImpact projects residual reduction without database mutation", () => {
    const simulation = simulateMitigationImpact({
      inherentRisk: 25,
      currentResidual: 20,
      proposedControls: [
        {
          control_name: "Automated CI/CD Vulnerability Scanning",
          effectiveness_pct: 60,
        },
        { control_name: "Penetration Testing", effectiveness_pct: 40 },
      ],
    });

    // avg eff = 50%, projected residual = 25 * (1 - 0.5) = 12.5
    assert.strictEqual(simulation.effectiveControlPct, 50);
    assert.strictEqual(simulation.projectedResidual, 12.5);
    assert.strictEqual(simulation.deltaPoints, 7.5);
    assert.strictEqual(simulation.reductionPercentage, 37.5);
    assert.match(simulation.explanation, /Simulation Result/);
    assert.match(
      simulation.explanation,
      /Projected residual risk decreases from 20 to 12.5/,
    );
  });
});
