// ============================================================================
// Risk Routes
// Provides simulation endpoints and risk inspection
// ============================================================================

const express = require("express");
const router = express.Router();
const {
  simulateRiskMitigation,
  getRiskDetails,
} = require("../controllers/riskController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/simulate", simulateRiskMitigation);
router.get("/:id", getRiskDetails);

module.exports = router;
