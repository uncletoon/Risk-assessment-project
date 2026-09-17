const { pool } = require("../config/db");

const CLIENT_CATEGORIES = [
  [
    "REPAYMENT_CAPACITY",
    "Repayment Capacity & Affordability",
    30.0,
    "Ability to meet the proposed repayment from verified disposable income and recurring cash flow.",
  ],
  [
    "DEBT_BURDEN",
    "Existing Debt & Leverage",
    20.0,
    "Existing obligations, leverage, debt service burden, and available borrowing headroom.",
  ],
  [
    "INCOME_STABILITY",
    "Income & Cash Flow Stability",
    15.0,
    "Consistency, source quality, volatility, and sustainability of income or business cash flow.",
  ],
  [
    "CREDIT_BEHAVIOR",
    "Credit & Repayment Behavior",
    15.0,
    "Previous repayment conduct, arrears, missed payments, account behavior, and credit history.",
  ],
  [
    "COLLATERAL_GUARANTEE",
    "Collateral & Guarantee Coverage",
    10.0,
    "Quality, ownership, enforceability, valuation, and coverage provided by collateral or guarantees.",
  ],
  [
    "KYC_DATA_QUALITY",
    "KYC, Fraud & Data Quality",
    10.0,
    "Identity consistency, document reliability, missing information, contradictions, and fraud indicators.",
  ],
];

const CLIENT_RULES = [
  [
    "DEBT_BURDEN",
    "Debt-to-Income Ratio",
    "GT",
    "40%",
    4,
    4,
    "High",
    "Debt obligations above 40% of verified income can materially weaken repayment capacity.",
  ],
  [
    "REPAYMENT_CAPACITY",
    "Debt Service Ratio",
    "GT",
    "40%",
    4,
    5,
    "Critical",
    "Debt service above 40% of verified disposable income leaves limited repayment buffer.",
  ],
  [
    "INCOME_STABILITY",
    "Operating Cash Flow Deficit",
    "LT",
    "0",
    4,
    5,
    "Critical",
    "Negative recurring cash flow directly threatens ongoing repayment ability.",
  ],
  [
    "REPAYMENT_CAPACITY",
    "Short-term Liquidity Ratio",
    "LT",
    "1.0",
    4,
    4,
    "High",
    "Liquidity below 1.0 indicates insufficient near-term resources for obligations.",
  ],
  [
    "INCOME_STABILITY",
    "Income Volatility",
    "GT",
    "30%",
    3,
    4,
    "High",
    "Large income variation reduces confidence in recurring repayment resources.",
  ],
  [
    "CREDIT_BEHAVIOR",
    "Late Payment Count",
    "GT",
    "0",
    4,
    4,
    "High",
    "Recent late payments indicate elevated repayment behavior risk.",
  ],
  [
    "COLLATERAL_GUARANTEE",
    "Collateral Coverage Ratio",
    "LT",
    "100%",
    3,
    4,
    "High",
    "Collateral value below the exposure leaves an unsecured recovery gap.",
  ],
  [
    "KYC_DATA_QUALITY",
    "Document Inconsistency",
    "CONTAINS",
    "inconsistent",
    5,
    5,
    "Critical",
    "Conflicting identity or financial records require verification before a credit decision.",
  ],
];

const LEGACY_CODES = [
  "FINANCIAL",
  "OPERATIONAL",
  "STRATEGIC",
  "TECHNOLOGICAL",
  "LEGAL_REGULATORY",
  "MARKET",
];

function mapLegacyCategory(code, factorName = "") {
  const factor = factorName.toLowerCase();
  if (factor.includes("debt") || factor.includes("leverage")) {
    return "DEBT_BURDEN";
  }
  if (
    factor.includes("cash") ||
    factor.includes("liquidity") ||
    factor.includes("income")
  ) {
    return "REPAYMENT_CAPACITY";
  }
  if (
    factor.includes("payment") ||
    factor.includes("arrear") ||
    factor.includes("credit")
  ) {
    return "CREDIT_BEHAVIOR";
  }
  if (factor.includes("collateral") || factor.includes("guarantee")) {
    return "COLLATERAL_GUARANTEE";
  }
  if (
    factor.includes("kyc") ||
    factor.includes("identity") ||
    factor.includes("compliance")
  ) {
    return "KYC_DATA_QUALITY";
  }

  switch (code) {
    case "FINANCIAL":
      return "REPAYMENT_CAPACITY";
    case "LEGAL_REGULATORY":
    case "TECHNOLOGICAL":
      return "KYC_DATA_QUALITY";
    case "OPERATIONAL":
    case "STRATEGIC":
    case "MARKET":
    default:
      return "INCOME_STABILITY";
  }
}

async function runMigration() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const [code, name, weight, description] of CLIENT_CATEGORIES) {
      await client.query(
        `INSERT INTO risk_categories (code, name, default_weight, description, is_active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           default_weight = EXCLUDED.default_weight,
           description = EXCLUDED.description,
           is_active = true,
           updated_at = NOW()`,
        [code, name, weight, description],
      );
    }

    await client.query(
      `UPDATE risk_categories
       SET is_active = false, updated_at = NOW()
       WHERE code = ANY($1::text[])`,
      [LEGACY_CODES],
    );

    const groupRes = await client.query(
      `SELECT id FROM rule_groups
       WHERE name = 'Standard Individual Credit Rules'
       LIMIT 1`,
    );
    const groupId = groupRes.rows[0]?.id || null;

    const existingRules = await client.query(
      `SELECT id, category_code, factor_name
       FROM risk_rules
       WHERE category_code = ANY($1::text[])`,
      [LEGACY_CODES],
    );
    for (const rule of existingRules.rows) {
      await client.query(
        `UPDATE risk_rules
         SET category_code = $1
         WHERE id = $2`,
        [mapLegacyCategory(rule.category_code, rule.factor_name), rule.id],
      );
    }

    for (const rule of CLIENT_RULES) {
      const [
        categoryCode,
        factorName,
        operator,
        threshold,
        likelihood,
        impact,
        severity,
        description,
      ] = rule;
      const existing = await client.query(
        `SELECT id FROM risk_rules
         WHERE factor_name = $1 AND condition_operator = $2 AND threshold_value = $3
         LIMIT 1`,
        [factorName, operator, threshold],
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO risk_rules
             (rule_group_id, category_code, factor_name, condition_operator, threshold_value, likelihood_score, impact_score, severity, description, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
          [
            groupId,
            categoryCode,
            factorName,
            operator,
            threshold,
            likelihood,
            impact,
            severity,
            description,
          ],
        );
      }
    }

    await client.query("COMMIT");
    console.log("Single client category migration completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Single client category migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch(async () => {
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runMigration, mapLegacyCategory };
