const { pool } = require('../config/db');

async function cleanSchema() {
  console.log('--- Inspecting PostgreSQL Schema for Non-Applicable Tables ---');
  
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const currentTables = res.rows.map(r => r.table_name);
  console.log('All Tables currently in DB:', currentTables);

  const activeEridssTables = new Set([
    'users',
    'organizations',
    'risk_categories',
    'risk_rules',
    'assessments',
    'documents',
    'extracted_facts',
    'identified_risks',
    'risk_evidence',
    'risk_controls',
    'risk_scores',
    'ai_analyses',
    'ai_recommendations',
    'mitigation_actions',
    'assessment_history',
    'audit_logs'
  ]);

  const nonApplicableTables = currentTables.filter(t => !activeEridssTables.has(t));

  if (nonApplicableTables.length === 0) {
    console.log('✓ No legacy or non-applicable tables found. The schema is 100% clean and compliant with ERIDSS specification.');
  } else {
    console.log('Found non-applicable tables to delete:', nonApplicableTables);
    for (const table of nonApplicableTables) {
      await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`✓ Deleted legacy table: ${table}`);
    }
  }

  const finalCheck = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log('\nFinal Clean Tables List (Active ERIDSS Entities):', finalCheck.rows.map(r => r.table_name));

  await pool.end();
}

cleanSchema().catch(err => {
  console.error('Error cleaning schema:', err);
  process.exit(1);
});
