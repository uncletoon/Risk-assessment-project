const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function initializeDatabase() {
  console.log('--- Initializing ERIDSS PostgreSQL Database ---');
  try {
    const sqlPath = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('Database initialized and seeded successfully.');

    const userCount = await pool.query('SELECT count(*) FROM users');
    const catCount = await pool.query('SELECT count(*) FROM risk_categories');
    const ruleCount = await pool.query('SELECT count(*) FROM risk_rules');

    console.log(`Users seeded: ${userCount.rows[0].count}`);
    console.log(`Risk categories seeded: ${catCount.rows[0].count}`);
    console.log(`Risk rules seeded: ${ruleCount.rows[0].count}`);
    return true;
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initializeDatabase };