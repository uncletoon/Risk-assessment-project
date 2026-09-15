// ============================================================================
// System Admin & Risk Governance Routes
// ============================================================================

const express = require("express");
const router = express.Router();
const {
  listUsers,
  getUserData,
  createNewUser,
  updateUserData,
  updateUserStatusHandler,
  listCategories,
  createNewCategory,
  updateCategoryData,
  deleteCategoryItem,
  updateWeight,
  updateWeightsBatch,
  listRuleGroups,
  createNewRuleGroup,
  updateRuleGroupData,
  deleteRuleGroupItem,
  listRules,
  createNewRule,
  updateRuleData,
  deleteRuleItem,
  listAuditLogs,
  exportAuditLogs,
  getHealth,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

// 1. User Governance (Admin only)
router.get("/users", authorize("SYSTEM_ADMIN"), listUsers);
router.get("/users/:id", authorize("SYSTEM_ADMIN"), getUserData);
router.post("/users", authorize("SYSTEM_ADMIN"), createNewUser);
router.put("/users/:id", authorize("SYSTEM_ADMIN"), updateUserData);
router.patch(
  "/users/:id/status",
  authorize("SYSTEM_ADMIN"),
  updateUserStatusHandler,
);

// 2. Risk Categories & Weights (System Admin and Risk Officer)
router.get(
  "/categories",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  listCategories,
);
router.post(
  "/categories",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  createNewCategory,
);
router.put(
  "/categories/weights",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  updateWeightsBatch,
);
router.put(
  "/categories/:code/weight",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  updateWeight,
);
router.put(
  "/categories/:code",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  updateCategoryData,
);
router.delete(
  "/categories/:code",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  deleteCategoryItem,
);

// 3. Risk Rule Groups (System Admin and Risk Officer)
router.get(
  "/rule-groups",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  listRuleGroups,
);
router.post(
  "/rule-groups",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  createNewRuleGroup,
);
router.put(
  "/rule-groups/:id",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  updateRuleGroupData,
);
router.delete(
  "/rule-groups/:id",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  deleteRuleGroupItem,
);

// 4. Deterministic Risk Rules Engine (System Admin and Risk Officer)
router.get("/rules", authorize("SYSTEM_ADMIN", "RISK_OFFICER"), listRules);
router.post("/rules", authorize("SYSTEM_ADMIN", "RISK_OFFICER"), createNewRule);
router.put(
  "/rules/:id",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  updateRuleData,
);
router.delete(
  "/rules/:id",
  authorize("SYSTEM_ADMIN", "RISK_OFFICER"),
  deleteRuleItem,
);

// 4. Audit & Health (Admin only)
router.get("/audit-logs", authorize("SYSTEM_ADMIN"), listAuditLogs);
router.get("/audit-logs/export", authorize("SYSTEM_ADMIN"), exportAuditLogs);
router.get("/health", authorize("SYSTEM_ADMIN"), getHealth);

module.exports = router;
