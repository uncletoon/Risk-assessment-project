const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role, full_name, email, department) => {
  return jwt.sign(
    { id, role, full_name, email, department },
    process.env.SESSION_SECRET || 'secret',
    { expiresIn: '30d' }
  );
};

// Admin User Management: List all users from PostgreSQL
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.role, 
        u.department, 
        u.status, 
        u.created_at,
        (SELECT COUNT(*) FROM risk_submissions WHERE submitted_by_id = u.id) AS submissions_count
      FROM users u 
      ORDER BY u.id ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ message: 'Error retrieving user list from database' });
  }
};

// Admin: Create new user in PostgreSQL
const createUser = async (req, res) => {
  const { full_name, email, password, role, department } = req.body;

  try {
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, password, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, department, status, created_at',
      [full_name, email, hashedPassword, role || 'employee', department || 'General Operations']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createUser error:', error);
    res.status(500).json({ message: 'Failed to create user in database' });
  }
};

const registerUser = async (req, res) => {
  const { full_name, email, password, role, department } = req.body;

  try {
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (full_name, email, password, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, department',
      [full_name, email, hashedPassword, role || 'employee', department || 'Operations']
    );

    const user = result.rows[0];

    res.status(201).json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      token: generateToken(user.id, user.role, user.full_name, user.email, user.department),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      token: generateToken(user.id, user.role, user.full_name, user.email, user.department),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Database error during authentication' });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const result = await pool.query(
      'SELECT id, full_name, email, role, department, status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ message: 'Error retrieving user profile from database' });
  }
};

// Admin: System Health & Audit logs from DB
const getSystemHealth = async (req, res) => {
  try {
    const [dbStats, tableSizes, recentAudits] = await Promise.all([
      pool.query(`
        SELECT 
          pg_database_size(current_database()) AS db_size_bytes,
          (SELECT count(*) FROM users) AS total_users,
          (SELECT count(*) FROM risk_submissions) AS total_submissions,
          (SELECT count(*) FROM risk_assessments) AS total_assessments
      `),
      pool.query(`
        SELECT relname AS table_name, n_live_tup AS row_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `),
      pool.query(`
        SELECT 
          s.id, 
          s.title, 
          s.status, 
          s.submitted_by_name, 
          s.decided_by, 
          s.created_at,
          s.decided_at
        FROM risk_submissions s
        ORDER BY s.created_at DESC
        LIMIT 10
      `)
    ]);

    res.json({
      database: {
        status: 'Connected',
        host: 'localhost:5433',
        dbName: 'eri',
        sizeFormatted: `${(parseInt(dbStats.rows[0].db_size_bytes || '0') / (1024 * 1024)).toFixed(2)} MB`,
        totalUsers: parseInt(dbStats.rows[0].total_users || '0'),
        totalSubmissions: parseInt(dbStats.rows[0].total_submissions || '0'),
        totalAssessments: parseInt(dbStats.rows[0].total_assessments || '0'),
      },
      tables: tableSizes.rows,
      auditLogs: recentAudits.rows,
    });
  } catch (error) {
    console.error('getSystemHealth error:', error);
    res.status(500).json({ message: 'Error retrieving system health data from database' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  createUser,
  getSystemHealth,
};
