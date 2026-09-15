// ============================================================================
// Employee & Document Submissions Service
// Multi-tenant workflow for employees to submit documents to Risk Officers
// ============================================================================

const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");
const { logAudit } = require("./auditService");
const { validateRequired } = require("../utils/validation");

/**
 * Employee submits a business document to their organization's Risk Officer
 */
async function submitDocument({
  organizationId,
  employeeId,
  title,
  description,
  file,
}) {
  if (!file) {
    throw new Error("No document file uploaded.");
  }

  const cleanTitle = (title || "").trim();
  if (!cleanTitle) {
    throw new Error("Document title is required.");
  }

  const cleanDesc = (description || "").trim();

  // Verify employee belongs to organization
  const empRes = await pool.query(
    "SELECT id, organization_id, status FROM users WHERE id = $1",
    [employeeId],
  );
  if (
    empRes.rows.length === 0 ||
    empRes.rows[0].organization_id !== organizationId
  ) {
    throw new Error("Unauthorized organization access.");
  }
  if (empRes.rows[0].status !== "active") {
    throw new Error("Your employee account is not active.");
  }

  const res = await pool.query(
    `INSERT INTO employee_submissions (
       organization_id, employee_id, title, description,
       document_name, document_path, file_size, mime_type, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUBMITTED')
     RETURNING *`,
    [
      organizationId,
      employeeId,
      cleanTitle,
      cleanDesc,
      file.originalname,
      file.path,
      file.size,
      file.mimetype,
    ],
  );

  const submission = res.rows[0];

  await logAudit(
    employeeId,
    organizationId,
    "EMPLOYEE_DOCUMENT_SUBMITTED",
    "employee_submissions",
    submission.id,
    {
      title: cleanTitle,
      document_name: file.originalname,
    },
  );

  return submission;
}

/**
 * Fetch submissions created by a specific employee
 */
async function getEmployeeSubmissions(employeeId, organizationId) {
  const res = await pool.query(
    `SELECT s.*, u.full_name as employee_name, u.email as employee_email
     FROM employee_submissions s
     JOIN users u ON s.employee_id = u.id
     WHERE s.employee_id = $1 AND s.organization_id = $2
     ORDER BY s.created_at DESC`,
    [employeeId, organizationId],
  );
  return res.rows;
}

/**
 * Risk Officer: List all employees under their organization
 */
async function getOrganizationEmployees(organizationId) {
  const res = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone_number, u.gender, u.role, u.department, u.status, u.created_at,
            (SELECT count(*) FROM employee_submissions WHERE employee_id = u.id) as submission_count
     FROM users u
     WHERE u.organization_id = $1 AND u.role IN ('EMPLOYEE', 'employee')
     ORDER BY 
       CASE u.status 
         WHEN 'pending' THEN 1 
         WHEN 'active' THEN 2 
         ELSE 3 
       END ASC, u.created_at DESC`,
    [organizationId],
  );
  return res.rows;
}

/**
 * Risk Officer: Get comprehensive employee details and their submissions
 */
async function getEmployeeDetails(employeeId, organizationId) {
  const empRes = await pool.query(
    `SELECT u.id, u.organization_id, u.full_name, u.email, u.phone_number, u.gender, u.role, u.department, u.status, u.created_at,
            o.name as organization_name
     FROM users u
     LEFT JOIN organizations o ON u.organization_id = o.id
     WHERE u.id = $1 AND u.organization_id = $2 AND u.role IN ('EMPLOYEE', 'employee')`,
    [employeeId, organizationId],
  );

  if (empRes.rows.length === 0) {
    throw new Error("Employee not found in your organization.");
  }

  const employee = empRes.rows[0];

  const submissionsRes = await pool.query(
    `SELECT s.*, a.title as assessment_title, a.overall_eri, a.eri_classification
     FROM employee_submissions s
     LEFT JOIN assessments a ON s.assessment_id = a.id
     WHERE s.employee_id = $1 AND s.organization_id = $2
     ORDER BY s.created_at DESC`,
    [employeeId, organizationId],
  );

  return {
    ...employee,
    submissions: submissionsRes.rows || [],
  };
}

/**
 * Risk Officer: Accept, Decline, Disable, or Enable an employee
 */
async function updateEmployeeStatus(
  employeeId,
  status,
  organizationId,
  officerUserId,
) {
  const cleanStatus = (status || "").toLowerCase().trim();
  let normalizedStatus;

  if (
    cleanStatus === "accept" ||
    cleanStatus === "active" ||
    cleanStatus === "approved" ||
    cleanStatus === "enable"
  ) {
    normalizedStatus = "active";
  } else if (
    cleanStatus === "decline" ||
    cleanStatus === "rejected" ||
    cleanStatus === "declined"
  ) {
    normalizedStatus = "rejected";
  } else if (
    cleanStatus === "disable" ||
    cleanStatus === "inactive" ||
    cleanStatus === "deactivated"
  ) {
    normalizedStatus = "inactive";
  } else {
    throw new Error(
      `Invalid status action: ${status}. Expected active, rejected, or inactive.`,
    );
  }

  const res = await pool.query(
    `UPDATE users
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND organization_id = $3 AND role IN ('EMPLOYEE', 'employee')
     RETURNING id, full_name, email, role, department, status, organization_id, updated_at`,
    [normalizedStatus, employeeId, organizationId],
  );

  if (res.rows.length === 0) {
    throw new Error("Employee not found in your organization.");
  }

  const updatedEmployee = res.rows[0];

  await logAudit(
    officerUserId,
    organizationId,
    "EMPLOYEE_STATUS_UPDATED",
    "users",
    employeeId,
    {
      newStatus: normalizedStatus,
      targetEmployeeEmail: updatedEmployee.email,
    },
  );

  return updatedEmployee;
}

/**
 * Risk Officer: List all document submissions from all employees in the organization
 */
async function getOrganizationSubmissions(organizationId) {
  const res = await pool.query(
    `SELECT s.*, u.full_name as employee_name, u.email as employee_email, u.department as employee_department,
            a.title as assessment_title, a.status as assessment_status
     FROM employee_submissions s
     JOIN users u ON s.employee_id = u.id
     LEFT JOIN assessments a ON s.assessment_id = a.id
     WHERE s.organization_id = $1
     ORDER BY s.created_at DESC`,
    [organizationId],
  );
  return res.rows;
}

/**
 * Get submission file metadata for downloading
 */
async function getSubmissionById(submissionId, organizationId) {
  const res = await pool.query(
    `SELECT s.*, u.full_name as employee_name, o.name as organization_name
     FROM employee_submissions s
     JOIN users u ON s.employee_id = u.id
     JOIN organizations o ON s.organization_id = o.id
     WHERE s.id = $1 AND s.organization_id = $2`,
    [submissionId, organizationId],
  );

  if (res.rows.length === 0) {
    throw new Error("Submission document not found.");
  }

  return res.rows[0];
}

module.exports = {
  submitDocument,
  getEmployeeSubmissions,
  getOrganizationEmployees,
  getEmployeeDetails,
  updateEmployeeStatus,
  getOrganizationSubmissions,
  getSubmissionById,
};
