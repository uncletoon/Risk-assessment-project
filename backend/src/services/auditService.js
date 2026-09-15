// ============================================================================
// Audit Service
// ============================================================================

const { pool } = require('../config/db');

async function logAudit(userId, organizationId, action, entityType, entityId, details = {}, ipAddress = '127.0.0.1') {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, organization_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId || null,
        organizationId || null,
        action,
        entityType,
        entityId || null,
        JSON.stringify(details || {}),
        ipAddress || '127.0.0.1',
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

async function getAuditLogs(options = {}) {
  // Support both passing a limit number or an options object
  const opts = typeof options === 'number' ? { limit: options } : options;
  const { limit = 100, action, actor, entityType, startDate, endDate, organizationId } = opts;

  let query = `
    SELECT a.*, u.full_name as user_name, u.email as user_email, o.name as organization_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN organizations o ON a.organization_id = o.id
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  if (organizationId) {
    query += ` AND a.organization_id = $${paramIdx++}`;
    params.push(organizationId);
  }

  if (action && action !== 'ALL') {
    query += ` AND a.action ILIKE $${paramIdx++}`;
    params.push(`%${action}%`);
  }

  if (actor) {
    query += ` AND (u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
    params.push(`%${actor}%`);
    paramIdx++;
  }

  if (entityType && entityType !== 'ALL') {
    query += ` AND a.entity_type ILIKE $${paramIdx++}`;
    params.push(`%${entityType}%`);
  }

  if (startDate) {
    query += ` AND a.created_at >= $${paramIdx++}`;
    params.push(new Date(startDate).toISOString());
  }

  if (endDate) {
    query += ` AND a.created_at <= $${paramIdx++}`;
    // include entire end date
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    params.push(end.toISOString());
  }

  query += ` ORDER BY a.created_at DESC LIMIT $${paramIdx++}`;
  params.push(Math.min(parseInt(limit, 10) || 100, 1000));

  const res = await pool.query(query, params);
  return res.rows;
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

async function generateAuditLogsCsv(filters = {}) {
  // Allow exporting up to 1000 records
  const logs = await getAuditLogs({ ...filters, limit: 1000 });

  const headers = [
    'Log ID',
    'Timestamp (UTC)',
    'Action',
    'Actor Full Name',
    'Actor Email',
    'Target Entity Type',
    'Entity ID',
    'IP Address',
    'Organization',
    'Event Details JSON',
  ];

  const rows = logs.map((log) => [
    log.id,
    new Date(log.created_at).toISOString(),
    log.action,
    log.user_name || 'System / Automated Pipeline',
    log.user_email || 'system@eridss.internal',
    log.entity_type,
    log.entity_id || '',
    log.ip_address || '127.0.0.1',
    log.organization_name || 'Global Enterprise',
    log.details,
  ]);

  const csvLines = [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ];

  return csvLines.join('\r\n');
}

module.exports = {
  logAudit,
  getAuditLogs,
  generateAuditLogsCsv,
};
