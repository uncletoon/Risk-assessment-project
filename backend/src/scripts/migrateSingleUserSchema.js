const { pool } = require("../config/db");

async function runMigration() {
  console.log(
    "--- Running Schema Migration for Single User Assessment Support ---",
  );
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'target_type') THEN
          ALTER TABLE assessments ADD COLUMN target_type VARCHAR(50) DEFAULT 'ENTERPRISE';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'client_name') THEN
          ALTER TABLE assessments ADD COLUMN client_name VARCHAR(150);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'client_identifier') THEN
          ALTER TABLE assessments ADD COLUMN client_identifier VARCHAR(100);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'client_email') THEN
          ALTER TABLE assessments ADD COLUMN client_email VARCHAR(150);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'client_phone') THEN
          ALTER TABLE assessments ADD COLUMN client_phone VARCHAR(50);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'client_income') THEN
          ALTER TABLE assessments ADD COLUMN client_income DECIMAL(18, 2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assessments' AND column_name = 'client_metadata') THEN
          ALTER TABLE assessments ADD COLUMN client_metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
      END $$;
    `);

    console.log(
      "Migration completed successfully: Single user / client columns verified in assessments table.",
    );
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
