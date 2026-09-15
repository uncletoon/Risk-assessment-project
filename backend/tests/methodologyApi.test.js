// ============================================================================
// Methodology Configuration & Simulation Integration Tests
// ============================================================================

const assert = require("assert");
const { test, describe, before, after } = require("node:test");
const { pool } = require("../src/config/db");
const {
  getOrganizationMethodology,
  updateOrganizationMethodology,
} = require("../src/services/organizationService");
const {
  simulateMitigationImpact,
} = require("../src/engines/risk/calculationEngine");

describe("Organization Methodology & What-If Simulation API Suite", () => {
  let testOrgId = 1;

  before(async () => {
    const inserted = await pool.query(
      `INSERT INTO organizations (name, industry, methodology_config) VALUES ('Isolated Test Org ' || NOW(), 'Technology', NULL) RETURNING id`,
    );
    testOrgId = inserted.rows[0].id;
  });

  after(async () => {
    try {
      await pool.query("DELETE FROM organizations WHERE id = $1", [testOrgId]);
    } catch (_) {}
    await pool.end();
  });

  test("getOrganizationMethodology returns standard default configuration when unconfigured", async () => {
    const methodology = await getOrganizationMethodology(testOrgId);
    assert.strictEqual(typeof methodology, "object");
    assert.strictEqual(methodology.matrix_dimension, 5);
    assert.strictEqual(Array.isArray(methodology.score_bands), true);
    assert.strictEqual(typeof methodology.category_weights, "object");
  });

  test("updateOrganizationMethodology rejects category weights not summing to 100%", async () => {
    const invalidConfig = {
      matrix_dimension: 5,
      category_weights: {
        FINANCIAL: 30.0,
        OPERATIONAL: 30.0,
        STRATEGIC: 10.0,
        LEGAL_REGULATORY: 10.0,
        MARKET: 10.0, // sum = 90%
      },
    };

    await assert.rejects(async () => {
      await updateOrganizationMethodology(testOrgId, invalidConfig);
    }, /Active category weights must sum to 100\.0%/);
  });

  test("updateOrganizationMethodology rejects invalid matrix dimensions", async () => {
    await assert.rejects(async () => {
      await updateOrganizationMethodology(testOrgId, { matrix_dimension: 7 });
    }, /Matrix dimension must be between 3 and 5/);
  });

  test("updateOrganizationMethodology saves custom 4x4 matrix and weights successfully", async () => {
    const validConfig = {
      matrix_dimension: 4,
      category_weights: {
        FINANCIAL: 30.0,
        OPERATIONAL: 30.0,
        STRATEGIC: 20.0,
        LEGAL_REGULATORY: 10.0,
        MARKET: 10.0, // sum = 100.0%
      },
      score_bands: [
        { name: "Low", min_score: 0, max_score: 25, color: "#10B981" },
        { name: "Medium", min_score: 26, max_score: 50, color: "#F59E0B" },
        { name: "High", min_score: 51, max_score: 75, color: "#EF4444" },
        { name: "Critical", min_score: 76, max_score: 100, color: "#991B1B" },
      ],
    };

    const updated = await updateOrganizationMethodology(testOrgId, validConfig);
    assert.strictEqual(updated.matrix_dimension, 4);
    assert.strictEqual(updated.category_weights.FINANCIAL, 30.0);

    const fetched = await getOrganizationMethodology(testOrgId);
    assert.strictEqual(fetched.matrix_dimension, 4);
    assert.strictEqual(fetched.is_custom, true);
  });

  test("simulateMitigationImpact correctly forecasts reduction with methodology", () => {
    const simulation = simulateMitigationImpact({
      inherentRisk: 16, // on 4x4, 16 is maximum
      currentResidual: 16,
      proposedControls: [
        { control_name: "Database Backup", effectiveness_pct: 75 },
      ],
      methodology: {
        matrix_dimension: 4,
        score_bands: [
          { name: "Low", min_score: 0, max_score: 25 },
          { name: "High", min_score: 26, max_score: 100 },
        ],
      },
    });

    // 16 * (1 - 0.75) = 4.0
    assert.strictEqual(simulation.projectedResidual, 4.0);
    assert.strictEqual(simulation.deltaPoints, 12.0);
    assert.strictEqual(simulation.reductionPercentage, 75.0);
    assert.match(
      simulation.explanation,
      /Projected residual risk decreases from 16 to 4/,
    );
  });
});
