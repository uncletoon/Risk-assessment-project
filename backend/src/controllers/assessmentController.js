// ============================================================================
// Assessment Controller
// Enforces multi-tenant organizational access control
// ============================================================================

const {
  createAssessment,
  attachDocument,
  runAssessmentPipeline,
  getAssessmentDetails,
  getAssessments,
} = require("../services/assessmentService");

const isUserAdmin = (user) =>
  user?.role === "SYSTEM_ADMIN" || user?.role === "ADMIN";

const createAssessmentHandler = async (req, res) => {
  try {
    const {
      organizationId,
      title,
      clientName,
      client_name,
      clientIdentifier,
      client_identifier,
      ruleGroupId,
      rule_group_id,
    } = req.body;
    const isSysAdmin = isUserAdmin(req.user);
    const orgId = isSysAdmin
      ? organizationId || req.user?.organization_id
      : req.user?.organization_id;

    if (!orgId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    const cleanName = (clientName || client_name || "").trim();

    const assessment = await createAssessment({
      organizationId: orgId,
      userId: req.user?.id,
      title:
        title ||
        (cleanName
          ? `Client Risk Assessment - ${cleanName}`
          : "Single Client Risk Assessment"),
      clientName: cleanName || null,
      clientIdentifier:
        (clientIdentifier || client_identifier || "").trim() || null,
      ruleGroupId: ruleGroupId || rule_group_id || null,
    });

    res.status(201).json(assessment);
  } catch (err) {
    console.error("createAssessment error:", err);
    res.status(400).json({ message: err.message });
  }
};

const uploadDocumentHandler = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id, 10);
    const allowReplace = req.query.replace === "true";

    // Verify ownership
    const details = await getAssessmentDetails(assessmentId);
    if (
      !isUserAdmin(req.user) &&
      details.assessment.organization_id !== req.user?.organization_id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to modify this assessment.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message:
          "No document uploaded. Please attach a PDF, DOCX, XLSX, or CSV file.",
      });
    }

    const doc = await attachDocument({
      assessmentId,
      file: req.file,
      userId: req.user?.id,
      allowReplace,
    });

    res.status(201).json({
      message: "Document attached successfully to assessment",
      document: doc,
    });
  } catch (err) {
    console.error("uploadDocument error:", err);
    res.status(400).json({ message: err.message });
  }
};

const startAssessmentPipelineHandler = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id, 10);
    const userId = req.user?.id;

    // Verify ownership
    const details = await getAssessmentDetails(assessmentId);
    if (
      !isUserAdmin(req.user) &&
      details.assessment.organization_id !== req.user?.organization_id
    ) {
      return res.status(403).json({
        message:
          "Forbidden: You do not have permission to process this assessment.",
      });
    }

    // Run pipeline synchronously
    const result = await runAssessmentPipeline(assessmentId, userId);

    res.json({
      message: "Assessment pipeline executed successfully",
      assessment: result.assessment,
      overallERI: result.assessment.overall_eri,
      classification: result.assessment.eri_classification,
      data: result,
    });
  } catch (err) {
    console.error("startAssessmentPipeline error:", err);
    res.status(500).json({
      message: "Assessment pipeline processing failed",
      error: err.message,
    });
  }
};

const getAssessmentDetailsHandler = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id, 10);
    const details = await getAssessmentDetails(assessmentId);

    // Verify ownership
    if (
      !isUserAdmin(req.user) &&
      details.assessment.organization_id !== req.user?.organization_id
    ) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.json(details);
  } catch (err) {
    console.error("getAssessmentDetails error:", err);
    res.status(404).json({ message: err.message });
  }
};

const getAssessmentStatusHandler = async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id, 10);
    const details = await getAssessmentDetails(assessmentId);

    // Verify ownership
    if (
      !isUserAdmin(req.user) &&
      details.assessment.organization_id !== req.user?.organization_id
    ) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    res.json({
      id: details.assessment.id,
      title: details.assessment.title,
      status: details.assessment.status,
      progressStep: details.assessment.progress_step,
      failureReason: details.assessment.failure_reason,
      overallERI: details.assessment.overall_eri,
      eriClassification: details.assessment.eri_classification,
      completedAt: details.assessment.completed_at,
    });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

const listAssessmentsHandler = async (req, res) => {
  try {
    const isSysAdmin = isUserAdmin(req.user);
    const orgId = isSysAdmin
      ? req.query.organizationId
        ? parseInt(req.query.organizationId, 10)
        : null
      : req.user?.organization_id;

    const assessments = await getAssessments(orgId);
    res.json(assessments);
  } catch (err) {
    console.error("listAssessments error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch assessments", error: err.message });
  }
};

module.exports = {
  createAssessmentHandler,
  uploadDocumentHandler,
  startAssessmentPipelineHandler,
  getAssessmentDetailsHandler,
  getAssessmentStatusHandler,
  listAssessmentsHandler,
};
