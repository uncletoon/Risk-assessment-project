const { pool } = require("../backend/src/config/db");

async function runMigration() {
  console.log("Running migration for users and organizations fields...");
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_type VARCHAR(100);
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS street_number VARCHAR(100);
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS product_types TEXT;
    `);

    // Set default/existing values
    await pool.query(`
      UPDATE users 
      SET phone_number = COALESCE(phone_number, '+250 788 123 456'),
          gender = COALESCE(gender, 'Male')
      WHERE id = 1;

      UPDATE users 
      SET phone_number = COALESCE(phone_number, '+250 788 654 321'),
          gender = COALESCE(gender, 'Female')
      WHERE id = 2;

      UPDATE organizations
      SET business_type = COALESCE(business_type, 'Microfinance & Digital Lending'),
          district = COALESCE(district, 'Nyarugenge'),
          sector = COALESCE(sector, 'Nyarugenge'),
          street_number = COALESCE(street_number, 'KN 4 Ave, Plot 12'),
          product_types = COALESCE(product_types, 'Digital Micro-Loans, SME Working Capital, Savings & Group Guarantees')
      WHERE id = 1;
    `);

    console.log("Migration completed successfully.");
    const u = await pool.query(
      "SELECT id, full_name, email, phone_number, gender FROM users",
    );
    console.log("Users:", u.rows);
    const o = await pool.query(
      "SELECT id, name, business_type, district, sector, street_number, product_types FROM organizations",
    );
    console.log("Organizations:", o.rows);
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
