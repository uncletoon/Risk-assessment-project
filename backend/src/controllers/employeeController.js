// ============================================================================
// Employee Controller
// ============================================================================

const fs = require("fs");
const path = require("path");
const {
  submitDocument,
  getEmployeeSubmissions,
  getOrganizationEmployees,
  getEmployeeDetails,
  updateEmployeeStatus,
  getOrganizationSubmissions,
  getSubmissionById,
} = require("../services/employeeService");

const isRiskOfficerOrAdmin = (user) =>
  user?.role === "RISK_OFFICER" ||
  user?.role === "risk_officer" ||
  user?.role === "SYSTEM_ADMIN" ||
  user?.role === "ADMIN";

// Employee: Submit document
const submitDocumentHandler = async (req, res) => {
  try {
    const { title, description } = req.body;
    const organizationId = req.user?.organization_id;
    const employeeId = req.user?.id;

    if (!req.file) {
      return res
        .status(400)
        .json({
          message: "Please attach a document file (PDF, DOCX, XLSX, CSV).",
        });
    }

    if (!organizationId) {
      return res
        .status(400)
        .json({ message: "No organization attached to your account." });
    }

    const submission = await submitDocument({
      organizationId,
      employeeId,
      title,
      description,
      file: req.file,
    });

    res.status(201).json({
      message: "Document submitted to Risk Officer successfully.",
      submission,
    });
  } catch (err) {
    console.error("submitDocument error:", err);
    res.status(400).json({ message: err.message });
  }
};

// Employee: List own submissions
const getEmployeeSubmissionsHandler = async (req, res) => {
  try {
    const submissions = await getEmployeeSubmissions(
      req.user?.id,
      req.user?.organization_id,
    );
    res.json(submissions);
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Failed to fetch your document submissions",
        error: err.message,
      });
  }
};

// Risk Officer: List organization employees
const getOrganizationEmployeesHandler = async (req, res) => {
  try {
    if (!isRiskOfficerOrAdmin(req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Access restricted to Risk Officers." });
    }

    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.json([]);
    }

    const employees = await getOrganizationEmployees(organizationId);
    res.json(employees);
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Failed to fetch organization employees",
        error: err.message,
      });
  }
};

// Risk Officer: Get single employee details
const getEmployeeDetailsHandler = async (req, res) => {
  try {
    if (!isRiskOfficerOrAdmin(req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Access restricted to Risk Officers." });
    }

    const employeeId = parseInt(req.params.id, 10);
    const details = await getEmployeeDetails(
      employeeId,
      req.user?.organization_id,
    );
    res.json(details);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

// Risk Officer: Update employee status (accept, decline, enable, disable)
const updateEmployeeStatusHandler = async (req, res) => {
  try {
    if (!isRiskOfficerOrAdmin(req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Access restricted to Risk Officers." });
    }

    const employeeId = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!status) {
      return res
        .status(400)
        .json({
          message: "Status is required (accept, decline, enable, disable).",
        });
    }

    const updated = await updateEmployeeStatus(
      employeeId,
      status,
      req.user?.organization_id,
      req.user?.id,
    );

    res.json({
      message: `Employee account status updated to ${updated.status}.`,
      employee: updated,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Risk Officer: List all document submissions from employees
const getOrganizationSubmissionsHandler = async (req, res) => {
  try {
    if (!isRiskOfficerOrAdmin(req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Access restricted to Risk Officers." });
    }

    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.json([]);
    }

    const submissions = await getOrganizationSubmissions(organizationId);
    res.json(submissions);
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Failed to fetch document submissions",
        error: err.message,
      });
  }
};

// Risk Officer & Employee: Download submitted document
const downloadSubmissionHandler = async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id, 10);
    const submission = await getSubmissionById(
      submissionId,
      req.user?.organization_id,
    );

    if (!fs.existsSync(submission.document_path)) {
      return res
        .status(404)
        .json({ message: "Physical document file not found on disk." });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(submission.document_name)}"`,
    );
    if (submission.mime_type) {
      res.setHeader("Content-Type", submission.mime_type);
    }

    const fileStream = fs.createReadStream(submission.document_path);
    fileStream.pipe(res);
  } catch (err) {
    console.error("Download submission error:", err);
    res.status(404).json({ message: err.message });
  }
};

module.exports = {
  submitDocumentHandler,
  getEmployeeSubmissionsHandler,
  getOrganizationEmployeesHandler,
  getEmployeeDetailsHandler,
  updateEmployeeStatusHandler,
  getOrganizationSubmissionsHandler,
  downloadSubmissionHandler,
};
