const { pool } = require("../config/db");

async function runMigration() {
  console.log("--- Running Migration for Employee Role and Submissions ---");
  try {
    // 1. Update users check constraints
    await pool.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SYSTEM_ADMIN', 'RISK_OFFICER', 'EMPLOYEE', 'employee'));

      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
      ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'pending', 'rejected', 'inactive', 'suspended'));
    `);
    console.log("✓ Updated users table role and status constraints.");

    // 2. Create employee_submissions table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_submissions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        document_name VARCHAR(255) NOT NULL,
        document_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'PROCESSED')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_employee_submissions_org ON employee_submissions(organization_id);
      CREATE INDEX IF NOT EXISTS idx_employee_submissions_emp ON employee_submissions(employee_id);
    `);
    console.log("✓ Verified employee_submissions table and indexes.");

    console.log("Employee role migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
