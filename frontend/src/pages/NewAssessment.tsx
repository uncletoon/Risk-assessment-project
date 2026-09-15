import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, RuleGroup } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  FilePlus2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building2,
  User,
  Sliders,
  ShieldCheck,
  Layers,
  Info,
} from "lucide-react";

export default function NewAssessment() {
  const { user, isSystemAdmin } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number>(
    user?.organization_id || 0,
  );
  const [categories, setCategories] = useState<any[]>([]);
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
  const [selectedRuleGroupId, setSelectedRuleGroupId] = useState<
    number | undefined
  >(undefined);

  // Assessment & Single Client State (Stored in DB only, never passed to AI)
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientIdentifier, setClientIdentifier] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    try {
      const [orgs, cats, groups] = await Promise.all([
        api.getOrganizations(),
        api.getAdminCategories(),
        api.getAdminRuleGroups(),
      ]);
      setOrganizations(orgs || []);
      setCategories(cats || []);
      setRuleGroups(groups || []);

      if (groups && groups.length > 0) {
        const activeGroup = groups.find((g) => g.is_active) || groups[0];
        setSelectedRuleGroupId(activeGroup.id);
      }

      if (
        user?.organization_id &&
        orgs.some((o: any) => o.id === user.organization_id)
      ) {
        setSelectedOrgId(user.organization_id);
      } else if (orgs && orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (err) {
      console.error("Failed to load initial assessment data:", err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (uploadedFile: File) => {
    setError(null);
    const ext = "." + uploadedFile.name.split(".").pop()?.toLowerCase();
    const allowed = [".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt"];

    if (!allowed.includes(ext)) {
      setError(
        `Invalid format: ${ext}. Only PDF, DOCX, XLSX, CSV, and TXT documents are supported.`,
      );
      setFile(null);
      return;
    }

    if (uploadedFile.size > 25 * 1024 * 1024) {
      setError("File exceeds maximum size limit of 25MB.");
      setFile(null);
      return;
    }

    setFile(uploadedFile);
    if (!title) {
      if (clientName.trim()) {
        setTitle(`Client Risk Assessment - ${clientName.trim()}`);
      } else {
        const baseName = uploadedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(`Client Assessment - ${baseName}`);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(
        "Please attach exactly one document (financial statement, pay slip, bank record, KYC) before starting the assessment.",
      );
      return;
    }

    if (!clientName.trim()) {
      setError("Please provide the client full name.");
      return;
    }

    const orgId = isSystemAdmin
      ? selectedOrgId
      : user?.organization_id || selectedOrgId;
    if (!orgId) {
      setError("No organization profile found for this account.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setStatusMessage("Creating client assessment record in database...");
      const finalTitle =
        title.trim() || `Client Risk Assessment - ${clientName.trim()}`;

      const assessment = await api.createAssessment({
        organizationId: orgId,
        title: finalTitle,
        clientName: clientName.trim(),
        clientIdentifier: clientIdentifier.trim() || undefined,
        ruleGroupId: selectedRuleGroupId,
      });

      setStatusMessage("Uploading and extracting document content...");
      await api.uploadDocument(assessment.id, file);

      setStatusMessage("Evaluating facts against selected Risk Rule Engine...");
      api.processAssessment(assessment.id).catch((err) => {
        console.warn(
          "Background pipeline error (will be reflected in assessment state):",
          err,
        );
      });

      navigate(`/assessments/${assessment.id}`);
    } catch (err: any) {
      console.error("Assessment submission error:", err);
      setError(err.message || "Failed to initialize assessment");
      setLoading(false);
    }
  };

  const activeOrg =
    organizations.find((o) => o.id === selectedOrgId) || organizations[0];
  const activeCategories = categories.filter((c) => c.is_active !== false);
  const selectedGroup = ruleGroups.find((g) => g.id === selectedRuleGroupId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-primary">
              Client Risk Assessment Wizard
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
              Evaluate single individual user / borrower risk by importing a
              financial document and selecting a specialized Risk Rule Engine.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-center gap-2 border border-error/40">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6"
      >
        {/* Step 1: Risk Rule Engine & Workspace Selection */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-secondary" />
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">
                Risk Rule Engine Selection
              </h3>
            </div>
            {selectedGroup && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                {selectedGroup.rules_count ?? 0} Rules Configured
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Select Rule Engine Group{" "}
                <span className="text-secondary">*</span>
              </label>
              <select
                value={selectedRuleGroupId || ""}
                onChange={(e) => setSelectedRuleGroupId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              >
                {ruleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.rules_count ?? 0} rules)
                  </option>
                ))}
              </select>
              {selectedGroup?.description && (
                <p className="text-[11px] text-on-surface-variant font-medium mt-1.5 leading-relaxed">
                  {selectedGroup.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Assigned Workspace / Organization
              </label>
              {isSystemAdmin && organizations.length > 1 ? (
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.industry})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-bold text-primary">
                  <Building2 className="w-4 h-4 text-secondary shrink-0" />
                  <span className="truncate">
                    {user?.organization_name || activeOrg?.name || "Enterprise"}{" "}
                    {activeOrg?.industry ? `(${activeOrg.industry})` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Active Categories Badge */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Active Category Weights:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeCategories.map((c) => (
                <span
                  key={c.code}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container-lowest text-primary border border-outline-variant"
                >
                  {c.name || c.code}{" "}
                  <strong className="text-secondary">
                    ({c.default_weight}%)
                  </strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2: Client Information (Stored in DB only, NOT for AI) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-secondary" />
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">
                Client Identification (Database Storage Only)
              </h3>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-tertiary">
              <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
              <span>Excluded from AI Prompts</span>
            </div>
          </div>

          {/* Privacy Notice Banner */}
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant flex items-start gap-2.5 text-xs text-on-surface-variant">
            <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Confidentiality Notice:</strong> The client name and
              identification number are stored exclusively in the database for
              tracking and compliance. They are{" "}
              <strong>never transmitted to AI models</strong>, ensuring
              objective and anonymous risk calculation based strictly on
              imported document evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Client / User Full Name{" "}
                <span className="text-secondary">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (!title || title.startsWith("Client Risk Assessment")) {
                    setTitle(`Client Risk Assessment - ${e.target.value}`);
                  }
                }}
                placeholder="e.g. Alice Uwase Mugabo"
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                Client Number / National ID
              </label>
              <input
                type="text"
                value={clientIdentifier}
                onChange={(e) => setClientIdentifier(e.target.value)}
                placeholder="e.g. 1199880012345678 or ACC-9842"
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
              Assessment Title / Label
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Client Risk Assessment - Alice Uwase"
              className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Step 3: Single Document Upload */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-primary">
              Attach Single Assessment Document{" "}
              <span className="text-secondary">*</span>
            </label>
            <span className="text-[11px] text-on-surface-variant font-semibold">
              PDF, DOCX, XLSX, CSV, TXT (Max 25MB)
            </span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 ${
              dragActive
                ? "border-primary bg-primary/5"
                : file
                  ? "border-secondary/60 bg-secondary/5"
                  : "border-outline-variant hover:border-primary/50 bg-surface-container-low"
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-primary">
                  {file.name}
                </p>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Document ready
                </p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-3 text-xs font-bold text-secondary hover:underline cursor-pointer"
                >
                  Change Attached Document
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-primary">
                  Drag and drop client financial document or KYC record here
                </p>
                <p className="text-xs text-on-surface-variant font-medium mt-1">
                  Supports bank statements, pay slips, credit reports, and
                  balance sheets
                </p>
                <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-xs font-bold text-primary cursor-pointer transition-colors">
                  <span>Browse Document</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant font-semibold text-center sm:text-left">
            {statusMessage ||
              "Ready to execute deterministic calculations and AI risk discovery."}
          </p>

          <button
            type="submit"
            disabled={loading || !file || !clientName.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                <span>Processing Assessment...</span>
              </>
            ) : (
              <>
                <span>Execute Risk Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
