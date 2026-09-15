// ============================================================================
// System Admin Controller
// ============================================================================

const {
  getUsers,
  getUserDetails,
  createUser,
  updateUser,
  updateUserStatus,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryWeight,
  updateCategoryWeightsBatch,
  getRuleGroups,
  createRuleGroup,
  updateRuleGroup,
  deleteRuleGroup,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getSystemHealth,
} = require("../services/adminService");
const {
  getAuditLogs,
  generateAuditLogsCsv,
} = require("../services/auditService");

// User Management
const listUsers = async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
};

const getUserData = async (req, res) => {
  try {
    const user = await getUserDetails(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const createNewUser = async (req, res) => {
  try {
    const user = await createUser(req.body, req.user?.id);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateUserData = async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body, req.user?.id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateUserStatusHandler = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res
        .status(400)
        .json({ message: "Status is required (active or inactive)." });
    }
    const user = await updateUserStatus(req.params.id, status, req.user?.id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Category Management
const listCategories = async (req, res) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch categories", error: err.message });
  }
};

const createNewCategory = async (req, res) => {
  try {
    const category = await createCategory(req.body, req.user?.id);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateCategoryData = async (req, res) => {
  try {
    const { code } = req.params;
    const updated = await updateCategory(code, req.body, req.user?.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteCategoryItem = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await deleteCategory(code, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateWeight = async (req, res) => {
  try {
    const { code } = req.params;
    const { defaultWeight } = req.body;
    const updated = await updateCategoryWeight(
      code,
      parseFloat(defaultWeight),
      req.user?.id,
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateWeightsBatch = async (req, res) => {
  try {
    const weights = req.body.weights || req.body;
    const updated = await updateCategoryWeightsBatch(weights, req.user?.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Risk Rule Groups Management
const listRuleGroups = async (req, res) => {
  try {
    const groups = await getRuleGroups();
    res.json(groups);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch rule groups", error: err.message });
  }
};

const createNewRuleGroup = async (req, res) => {
  try {
    const group = await createRuleGroup(req.body, req.user?.id);
    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateRuleGroupData = async (req, res) => {
  try {
    const group = await updateRuleGroup(req.params.id, req.body, req.user?.id);
    res.json(group);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteRuleGroupItem = async (req, res) => {
  try {
    const result = await deleteRuleGroup(req.params.id, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Deterministic Rules Management
const listRules = async (req, res) => {
  try {
    const groupId = req.query.groupId || req.query.ruleGroupId || null;
    const rules = await getRules(groupId);
    res.json(rules);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch rules", error: err.message });
  }
};

const createNewRule = async (req, res) => {
  try {
    const rule = await createRule(req.body, req.user?.id);
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateRuleData = async (req, res) => {
  try {
    const rule = await updateRule(req.params.id, req.body, req.user?.id);
    res.json(rule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteRuleItem = async (req, res) => {
  try {
    const result = await deleteRule(req.params.id, req.user?.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Audit Logs & Health
const listAuditLogs = async (req, res) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit || "100", 10),
      action: req.query.action,
      actor: req.query.actor,
      entityType: req.query.entityType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const logs = await getAuditLogs(filters);
    res.json(logs);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch audit logs", error: err.message });
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const filters = {
      action: req.query.action,
      actor: req.query.actor,
      entityType: req.query.entityType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const csvContent = await generateAuditLogsCsv(filters);
    const filename = `ERIDSS_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("Failed to export audit logs:", err);
    res
      .status(500)
      .json({ message: "Failed to export audit logs", error: err.message });
  }
};

const getHealth = async (req, res) => {
  try {
    const health = await getSystemHealth();
    res.json(health);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Health check failed", error: err.message });
  }
};

module.exports = {
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
};
