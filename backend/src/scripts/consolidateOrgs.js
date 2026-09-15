const { pool } = require('../config/db');

async function consolidate() {
  console.log('--- Consolidating Organizations in PostgreSQL Database ---');
  
  // Update Org #1 name to RWANDA KABUHARIWE (or keep current name)
  await pool.query(`
    UPDATE organizations 
    SET name = 'RWANDA KABUHARIWE', 
        industry = 'Financial & Enterprise Services',
        updated_at = NOW()
    WHERE id = 1;
  `);

  // Point all assessments and users to Org #1
  await pool.query('UPDATE assessments SET organization_id = 1 WHERE organization_id != 1;');
  await pool.query('UPDATE users SET organization_id = 1 WHERE organization_id != 1;');
  await pool.query('UPDATE assessment_history SET organization_id = 1 WHERE organization_id != 1;');
  
  // Delete duplicate organizations
  await pool.query('DELETE FROM organizations WHERE id > 1;');

  console.log('✓ Successfully consolidated organizations.');
  
  const orgs = await pool.query('SELECT * FROM organizations');
  console.log('Current Active Organizations:', orgs.rows);

  const assessments = await pool.query(`
    SELECT id, organization_id, title, status, overall_eri, eri_classification, completed_at
    FROM assessments
  `);
  console.log('Assessments in DB:', assessments.rows);

  await pool.end();
}

consolidate().catch(err => {
  console.error('Error consolidating:', err);
  process.exit(1);
});
