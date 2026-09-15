// ============================================================================
// Auth Routes
// ============================================================================

const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  getPublicOrganizations,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.get("/organizations", getPublicOrganizations);
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

module.exports = router;
