import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import {
  UploadCloud,
  FileText,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Calendar,
  Send,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployeeSubmissions();
      setSubmissions(data || []);
    } catch (err: any) {
      console.error("Failed to load submissions:", err);
      showNotification(
        "error",
        err.message || "Failed to load document submissions.",
      );
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        // Pre-fill title from filename without extension
        const cleanName = selected.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      setFormError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!file) {
      setFormError("Please select a business document file to upload.");
      return;
    }

    if (!title.trim()) {
      setFormError("Please enter a descriptive title for this document.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitEmployeeDocument(
        file,
        title.trim(),
        description.trim(),
      );
      showNotification(
        "success",
        res.message || "Document submitted to your Risk Officer successfully.",
      );
      setFile(null);
      setTitle("");
      setDescription("");
      await fetchSubmissions();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit document.");
      showNotification("error", err.message || "Failed to submit document.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (
    submissionId: number,
    documentName?: string,
  ) => {
    try {
      await api.downloadSubmission(submissionId, documentName);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to download document.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold border animate-in slide-in-from-top duration-300 ${
            notification.type === "success"
              ? "bg-tertiary-container text-on-tertiary-container border-tertiary-fixed-dim"
              : "bg-error-container text-on-error-container border-error"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-on-tertiary-container shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-on-error-container shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Enterprise Employee Header Banner */}
      <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building className="w-4 h-4 text-secondary" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {user?.organization_name || "Enterprise Workspace"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              Operational Document Submission Portal
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
              Submit your departmental reports, financial sheets, and audit
              notes directly to your Risk Officer.
            </p>
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant text-right text-xs shrink-0">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
              Assigned Department
            </span>
            <p className="font-extrabold text-primary">
              {user?.department || "Operations"}
            </p>
          </div>
        </div>
      </div>

      {/* Submission Form & Instructions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Upload Form */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-primary border-b border-outline-variant pb-3">
            <Send className="w-4 h-4 text-primary" />
            <span>Send Document to Risk Officer</span>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-error-container/60 border border-error/50 flex items-start gap-2.5 text-xs font-bold text-on-error-container">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* File Dropzone */}
            <div>
              <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                Select Document File <span className="text-secondary">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                  file
                    ? "border-secondary bg-secondary/5"
                    : "border-outline-variant bg-surface-container-low hover:border-primary"
                }`}
                onClick={() =>
                  document.getElementById("employee-file-input")?.click()
                }
              >
                <input
                  id="employee-file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                  onChange={handleFileChange}
                />
                <UploadCloud
                  className={`w-10 h-10 mx-auto mb-2 ${file ? "text-secondary" : "text-on-surface-variant"}`}
                />
                {file ? (
                  <div className="space-y-1">
                    <p className="font-extrabold text-primary text-xs truncate max-w-sm mx-auto">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <span className="inline-block text-[10px] font-bold text-secondary">
                      Click to replace file
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-primary text-xs">
                      Click to browse or drag & drop document
                    </p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Supports PDF, Word (DOCX), Excel (XLSX, CSV)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                Document Title <span className="text-secondary">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Q3 Financial Statement & Credit Default Summary"
              />
            </div>

            {/* Document Description */}
            <div>
              <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                Operational Notes & Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Provide context on this document, key data points, or potential risks to highlight for the Risk Officer..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 text-secondary" />
                    <span>Submit to Risk Officer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Workflow Overview Card */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-primary border-b border-outline-variant pb-3">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span>Workflow Guidelines</span>
          </div>

          <div className="space-y-3.5 text-xs text-on-surface-variant">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[11px] flex items-center justify-center shrink-0">
                1
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-primary">Upload Document:</strong>{" "}
                Attach your financial report, audit trail, or operations log.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[11px] flex items-center justify-center shrink-0">
                2
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-primary">Risk Officer Review:</strong>{" "}
                Your Risk Officer downloads and inspects the submission under
                the Organization portal.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[11px] flex items-center justify-center shrink-0">
                3
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong className="text-primary">Risk Assessment:</strong> The
                document is processed through deterministic risk rules and AI
                calculations to generate the Enterprise Risk Index (ERI).
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-[11px] font-semibold text-primary space-y-1">
            <p className="font-bold text-primary">Need Help?</p>
            <p className="text-on-surface-variant text-[10px]">
              Contact your organization's Risk Officer directly for questions
              regarding document requirements.
            </p>
          </div>
        </div>
      </div>

      {/* Submissions History Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <div className="p-5 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-black text-primary">
              Your Document Submission History
            </h3>
          </div>
          <span className="text-xs font-bold text-on-surface-variant">
            {submissions.length} Submissions
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 text-primary">
            <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-bold">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-10 text-center text-on-surface-variant">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-secondary mb-2 opacity-50" />
            <p className="text-sm font-bold text-primary">
              No document submissions yet.
            </p>
            <p className="text-xs font-medium mt-1">
              Use the form above to submit your first business document to the
              Risk Officer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-[11px] font-black uppercase tracking-wider text-primary">
                  <th className="py-3 px-5">Document Title & File</th>
                  <th className="py-3 px-4">Description / Notes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-5 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-surface-container-low/60 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="space-y-0.5 max-w-[220px]">
                        <p
                          className="font-extrabold text-primary truncate"
                          title={s.title}
                        >
                          {s.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant truncate">
                          <FileText className="w-3 h-3 text-secondary shrink-0" />
                          <span className="truncate" title={s.document_name}>
                            {s.document_name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-[11px] text-on-surface line-clamp-2 max-w-[260px]">
                        {s.description || "No description provided"}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-secondary/15 text-secondary border-secondary/30">
                        {s.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[11px] font-medium text-on-surface-variant">
                      {new Date(s.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleDownload(s.id, s.document_name)}
                        className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary border border-outline-variant font-bold transition-all cursor-pointer"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5 text-secondary" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
