// ============================================================================
// Employee & Organization Employee Management Routes
// ============================================================================

const express = require("express");
const router = express.Router();
const {
  submitDocumentHandler,
  getEmployeeSubmissionsHandler,
  getOrganizationEmployeesHandler,
  getEmployeeDetailsHandler,
  updateEmployeeStatusHandler,
  getOrganizationSubmissionsHandler,
  downloadSubmissionHandler,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.use(protect);

// Employee actions
router.post(
  "/submissions",
  (req, res, next) => {
    upload.single("document")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  submitDocumentHandler,
);

router.get("/submissions", getEmployeeSubmissionsHandler);
router.get("/submissions/:id/download", downloadSubmissionHandler);

// Risk Officer actions
router.get("/organization/employees", getOrganizationEmployeesHandler);
router.get("/organization/employees/:id", getEmployeeDetailsHandler);
router.patch("/organization/employees/:id/status", updateEmployeeStatusHandler);
router.get("/organization/submissions", getOrganizationSubmissionsHandler);

module.exports = router;
