// ============================================================================
// Auth Controller
// ============================================================================

const { pool } = require("../config/db");
const {
  authenticateUser,
  getUserById,
  updateUserProfile,
  registerRiskOfficer,
  registerEmployee,
} = require("../services/authService");

const register = async (req, res) => {
  try {
    const {
      role,
      full_name,
      fullName,
      email,
      phone_number,
      phoneNumber,
      gender,
      password,
      organization,
      organization_id,
      organizationId,
      department,
    } = req.body;

    if (
      role === "EMPLOYEE" ||
      (!organization && (organizationId || organization_id))
    ) {
      const result = await registerEmployee({
        fullName: fullName || full_name,
        email,
        phoneNumber: phoneNumber || phone_number,
        gender,
        password,
        organizationId: organizationId || organization_id,
        department,
      });
      return res.status(201).json(result);
    }

    const result = await registerRiskOfficer({
      fullName: fullName || full_name,
      email,
      phoneNumber: phoneNumber || phone_number,
      gender,
      password,
      organization,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Registration failed" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const userData = await authenticateUser(email, password);
    res.json(userData);
  } catch (err) {
    res.status(401).json({ message: err.message || "Authentication failed" });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await getUserById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { full_name, email, phone_number, gender } = req.body;
    const updated = await updateUserProfile(req.user.id, {
      fullName: full_name,
      email,
      phoneNumber: phone_number,
      gender,
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getPublicOrganizations = async (req, res) => {
  try {
    const orgs = await pool.query(
      "SELECT id, name, industry, business_type, district, sector FROM organizations ORDER BY name ASC",
    );
    res.json(orgs.rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  getPublicOrganizations,
};
