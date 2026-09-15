// ============================================================================
// Organization Routes
// ============================================================================

const express = require("express");
const router = express.Router();
const {
  listOrganizations,
  getOrganization,
  createOrg,
  updateOrg,
  getMethodologyHandler,
  updateMethodologyHandler,
} = require("../controllers/organizationController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.get("/", listOrganizations);
router.get("/:id/methodology", getMethodologyHandler);
router.put("/:id/methodology", updateMethodologyHandler);
router.get("/:id", getOrganization);
router.post("/", createOrg);
router.put("/:id", updateOrg);

module.exports = router;
