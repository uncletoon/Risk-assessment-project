const { pool } = require("../config/db");

async function runMigration() {
  console.log(
    "--- Running Migration: Methodology Configuration & Snapshots ---",
  );
  try {
    await pool.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS methodology_config JSONB DEFAULT NULL;
    `);
    console.log("Added methodology_config column to organizations table.");

    await pool.query(`
      ALTER TABLE assessments 
      ADD COLUMN IF NOT EXISTS methodology_snapshot JSONB DEFAULT NULL;
    `);
    console.log("Added methodology_snapshot column to assessments table.");

    await pool.query(`
      ALTER TABLE assessments 
      ADD COLUMN IF NOT EXISTS eri_explanation TEXT DEFAULT NULL;
    `);
    console.log("Added eri_explanation column to assessments table.");

    console.log("Migration completed successfully.");
    return true;
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
