const { pool } = require("../config/db");

async function runMigration() {
  console.log("--- Running Migration for Risk Rule Engine Groups ---");
  try {
    // 1. Create rule_groups table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rule_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Table 'rule_groups' verified/created.");

    // 2. Add rule_group_id to risk_rules
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'risk_rules' AND column_name = 'rule_group_id'
        ) THEN
          ALTER TABLE risk_rules ADD COLUMN rule_group_id INTEGER REFERENCES rule_groups(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log("✓ Column 'rule_group_id' verified/added to 'risk_rules'.");

    // 3. Add rule_group_id to assessments
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'assessments' AND column_name = 'rule_group_id'
        ) THEN
          ALTER TABLE assessments ADD COLUMN rule_group_id INTEGER REFERENCES rule_groups(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log("✓ Column 'rule_group_id' verified/added to 'assessments'.");

    // 4. Seed default Rule Groups if none exist
    const groupsCheck = await pool.query("SELECT id, name FROM rule_groups");
    let defaultGroupId = null;

    if (groupsCheck.rows.length === 0) {
      const seedRes = await pool.query(`
        INSERT INTO rule_groups (name, description, is_active)
        VALUES 
          ('Standard Individual Credit Rules', 'General risk rules engine for personal loans, salary-backed credit, and individual financial health.', true),
          ('Microfinance & Small Enterprise Rules', 'Specialized rules engine evaluating micro-credit turnover, working capital ratios, and loan guarantee coverages.', true),
          ('High-Net-Worth & Commercial Lending Rules', 'Deep liquidity, leverage ratios, and asset-backed debt capacity assessment rules.', true)
        RETURNING id, name;
      `);
      console.log(
        "✓ Seeded default rule groups:",
        seedRes.rows.map((r) => r.name).join(", "),
      );
      defaultGroupId = seedRes.rows[0].id;
    } else {
      defaultGroupId = groupsCheck.rows[0].id;
      console.log(
        "✓ Rule groups already exist. Default group ID:",
        defaultGroupId,
      );
    }

    // 5. Associate any unassigned risk_rules to the default rule group
    if (defaultGroupId) {
      const updateRulesRes = await pool.query(
        "UPDATE risk_rules SET rule_group_id = $1 WHERE rule_group_id IS NULL",
        [defaultGroupId],
      );
      console.log(
        `✓ Assigned ${updateRulesRes.rowCount} existing rules to rule group #${defaultGroupId}.`,
      );
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
