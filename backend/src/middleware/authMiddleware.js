// ============================================================================
// Auth & Role Authorization Middleware
// ============================================================================

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../services/authService");
const { pool } = require("../config/db");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized: Access token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await pool.query(
      "SELECT id, organization_id, full_name, email, role, department, status FROM users WHERE id = $1",
      [decoded.id],
    );

    if (userRes.rows.length === 0 || userRes.rows[0].status !== "active") {
      return res
        .status(401)
        .json({ message: "User account not found or inactive" });
    }

    req.user = userRes.rows[0];
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res
      .status(401)
      .json({ message: "Not authorized: Invalid or expired token" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to role(s): ${roles.join(", ")}`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
