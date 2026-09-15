import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface PiiScanResult {
  hasPII: boolean;
  detectedEmails: string[];
  detectedPhoneNumbers: string[];
  reason: string;
  advice: string | null;
  tempPath?: string;
  originalName?: string;
}

const DEMO_PRESETS = [
  {
    category: "technological",
    icon: "database",
    label: "Tech: DR Backup Storage Flaw",
    title: "Core Database Disaster Recovery Backup Storage Vulnerability",
    description:
      "Nightly backup archives failed automated cryptographic integrity verification for 3 consecutive days due to an unpatched legacy storage API endpoint.",
    sampleCsv:
      "backup_id,timestamp,storage_endpoint,status_code,checksum_valid,error_code\nDR-881,2026-08-20T02:00:00Z,s3-legacy.internal,502,0,ERR_INTEGRITY_FAIL\nDR-882,2026-08-21T02:00:00Z,s3-legacy.internal,502,0,ERR_INTEGRITY_FAIL\nDR-883,2026-08-22T02:00:00Z,s3-legacy.internal,502,0,ERR_INTEGRITY_FAIL\n",
    filename: "dr_backup_audit_log.csv",
  },
  {
    category: "financial",
    icon: "currency_exchange",
    label: "Financial: FX Margin Surcharge",
    title: "Supplier Currency Exchange Surcharge Volatility Exposure",
    description:
      "Rapid depreciation of local currency against USD is forcing core imported raw material suppliers to demand a 14% surcharge on all active supply contracts.",
    sampleCsv:
      "supplier_id,contract_id,base_amount_rwf,usd_exchange_rate,surcharge_pct,adjusted_cost_rwf\nSUP-101,CT-2026-A,45000000,1340.50,14.0,51300000\nSUP-102,CT-2026-B,38000000,1340.50,14.0,43320000\nSUP-103,CT-2026-C,22000000,1340.50,14.0,25080000\n",
    filename: "fx_supplier_surcharge.csv",
  },
  {
    category: "operational",
    icon: "local_shipping",
    label: "Operational: Customs Snarl",
    title: "Primary Freight Forwarder Customs Clearance Snarl",
    description:
      "Border customs inspections have extended primary cargo clearance duration from 48 hours to 18 days, creating a critical inventory stockout threat.",
    sampleCsv:
      "shipment_id,origin,dest,dispatch_date,expected_clearance,actual_delay_days,inventory_impact\nSH-501,Mombasa,Kigali,2026-08-01,2026-08-03,18,Critical\nSH-502,DarEsSalaam,Kigali,2026-08-05,2026-08-07,16,High\n",
    filename: "custom_delay_report.csv",
  },
  {
    category: "legal_compliance",
    icon: "gavel",
    label: "Legal: Data Law Consent Gap",
    title: "Customer Onboarding Data Privacy Consent Compliance Deficit",
    description:
      "Internal regulatory audit flagged that customer digital onboarding forms lack explicit granular consent checkboxes mandated by the new 2026 Data Protection Law.",
    sampleCsv:
      "channel_id,user_accounts_impacted,consent_captured,audit_status,potential_fine_rwf\nCH-APP,12500,0,NON_COMPLIANT,45000000\nCH-WEB,8400,0,NON_COMPLIANT,20000000\n",
    filename: "privacy_gap_telemetry.csv",
  },
  {
    category: "strategic",
    icon: "strategy",
    label: "Strategic: Competitor Price War",
    title: "Aggressive Competitor Regional Price Dumping Strategy",
    description:
      "A venture-backed regional entrant has launched 30% price subsidies and zero-fee onboarding, causing a sudden 6% contraction in customer pipeline velocity.",
    sampleCsv:
      "region,competitor_name,subsidy_discount_pct,market_churn_pct,revenue_risk_rwf\nCentral,FinTechCorp,30.0,6.2,35000000\nEast,FinTechCorp,30.0,5.8,18000000\n",
    filename: "competitor_impact_data.csv",
  },
  {
    category: "market",
    icon: "trending_down",
    label: "Market: Retail Volume Drop",
    title: "SME Retail Merchant Transaction Volume Contraction",
    description:
      "Frontline merchant transaction telemetry reveals an 18% decline in commercial turnover among retail trade partners over the past 60 days.",
    sampleCsv:
      "merchant_tier,active_merchants,prev_month_rwf,current_month_rwf,decline_pct\nTier-1-SME,45,185000000,151700000,18.0\nTier-2-Retail,120,95000000,77900000,18.0\n",
    filename: "retail_turnover_drop.csv",
  },
];

export default function SubmitReport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PiiScanResult | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("operational");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Apply Demo Scenario Preset
  const handleApplyPreset = (preset: (typeof DEMO_PRESETS)[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setDescription(preset.description);

    // Create a virtual file object
    const blob = new Blob([preset.sampleCsv], { type: "text/csv" });
    const mockFile = new File([blob], preset.filename, { type: "text/csv" });
    setFile(mockFile);
    setScanResult(null);
    setMessage({
      type: "success",
      text: "Loaded scenario! Click 'Scan File with AI' below to verify PII compliance.",
    });
  };

  // Step 1: Scan file for PII using Gemini AI
  const handleScanFile = async () => {
    if (!file) {
      setMessage({
        type: "error",
        text: "Please select a document or apply a demo scenario preset first.",
      });
      return;
    }

    setScanning(true);
    setMessage(null);
    setScanResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/risk/validate-pii", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("PII scan service failed");
      }

      const data: PiiScanResult = await res.json();
      setScanResult(data);

      if (data.hasPII) {
        setMessage({
          type: "error",
          text: "Sensitive PII (Phone numbers or Email addresses) detected. Submissions are blocked until confidential contact information is redacted.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Privacy check passed! Zero phone numbers or email addresses found. You may now complete your submission.",
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: "Error connecting to Gemini Privacy Scanner. Please retry.",
      });
    } finally {
      setScanning(false);
    }
  };

  // Step 2: Submit to Risk Officer once clean
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scanResult || scanResult.hasPII) {
      setMessage({
        type: "error",
        text: "You must scan the document and ensure it contains no sensitive PII before submitting.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("piiClean", "true");
    if (scanResult.tempPath) formData.append("tempPath", scanResult.tempPath);

    try {
      const res = await fetch("/api/v1/risk/submit-incident", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to submit incident");
      }

      setMessage({
        type: "success",
        text: "Enterprise risk report successfully submitted to Risk Officer review queue!",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: "Failed to submit report. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[24px]">
            flag
          </span>
          <h2 className="text-2xl font-bold text-on-surface">
            Frontline Threat & Risk Incident Intake
          </h2>
        </div>
        <p className="text-xs text-on-surface-variant mt-1">
          Upload operational evidence or frontline threat observations for Risk
          Officer review and Enterprise Risk Index (ERI) evaluation.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs p-6 flex flex-col gap-6">
        {/* SECTION 1: Document Upload & Gemini PII Validation */}
        <div className="border-b border-outline-variant pb-6">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-1 uppercase tracking-wider">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-container text-on-primary text-[10px] font-bold">
              1
            </span>
            Upload Supporting Evidence & Gemini AI Privacy Scan
          </h3>
          <p className="text-xs text-on-surface-variant mb-4">
            AI strictly verifies that no confidential contact information (
            <span className="font-semibold text-error">
              phone numbers or emails
            </span>
            ) is present. Monetary amounts in Rwf, dates, and ID codes are
            permitted.
          </p>

          <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-outline-variant rounded-lg p-6 bg-surface-bright hover:bg-surface-container transition-colors relative flex flex-col items-center justify-center">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.txt"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setScanResult(null);
                  setMessage(null);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center mb-2 text-primary-container">
                <span className="material-symbols-outlined text-[22px]">
                  cloud_upload
                </span>
              </div>
              <p className="text-xs font-semibold text-on-surface text-center">
                <span className="text-primary font-bold">
                  Click to select evidence file
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-[11px] text-on-surface-variant text-center mt-0.5">
                CSV, Excel, PDF, or TXT format supported
              </p>
              {file && (
                <div className="mt-3 px-3 py-1 rounded bg-surface-container-high border border-outline-variant text-xs font-medium text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    description
                  </span>
                  <span>{file.name}</span>
                  <span className="text-[10px] text-on-surface-variant">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* AI Privacy Scan Action */}
            <div className="flex items-center justify-between bg-surface-container-low p-3.5 rounded-lg border border-outline-variant">
              <div>
                <p className="text-xs font-bold text-on-surface">
                  Step 1.1: Automated PII & Privacy Scan
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Verify privacy compliance before enabling report submission.
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanFile}
                disabled={!file || scanning}
                className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  !file || scanning
                    ? "bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed"
                    : "bg-primary text-on-primary hover:bg-primary/90 cursor-pointer"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {scanning ? "sync" : "security"}
                </span>
                {scanning ? "AI Scanning..." : "Scan File with AI"}
              </button>
            </div>

            {/* PII Scan Feedback Card */}
            {scanResult && (
              <div
                className={`p-4 rounded-lg border transition-all ${
                  scanResult.hasPII
                    ? "bg-error-container/20 border-error/40 text-error"
                    : "bg-primary-container/15 border-primary/30 text-on-surface"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 ${
                      scanResult.hasPII ? "text-error" : "text-primary"
                    }`}
                  >
                    {scanResult.hasPII ? "warning" : "verified_user"}
                  </span>
                  <div className="flex-1 text-xs">
                    <h4 className="font-bold text-sm">
                      {scanResult.hasPII
                        ? "Privacy Alert: Sensitive PII Found"
                        : "Privacy Check Passed (No Personal Information)"}
                    </h4>
                    <p className="text-on-surface-variant mt-0.5">
                      {scanResult.reason}
                    </p>

                    {scanResult.hasPII && (
                      <div className="mt-2.5 flex flex-col gap-1.5 bg-surface-container-lowest p-2.5 rounded border border-error/30">
                        {scanResult.detectedPhoneNumbers.length > 0 && (
                          <div>
                            <span className="font-semibold text-error">
                              Detected Phone Numbers:{" "}
                            </span>
                            <span className="text-on-surface">
                              {scanResult.detectedPhoneNumbers.join(", ")}
                            </span>
                          </div>
                        )}
                        {scanResult.detectedEmails.length > 0 && (
                          <div>
                            <span className="font-semibold text-error">
                              Detected Emails:{" "}
                            </span>
                            <span className="text-on-surface">
                              {scanResult.detectedEmails.join(", ")}
                            </span>
                          </div>
                        )}
                        {scanResult.advice && (
                          <p className="text-on-surface-variant italic mt-0.5">
                            {scanResult.advice}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Threat Narrative & Details */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 mb-1 uppercase tracking-wider">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-container text-on-primary text-[10px] font-bold">
                2
              </span>
              Risk Narrative & Categorization
            </h3>
            <p className="text-xs text-on-surface-variant">
              Classify the risk pillar and describe potential operational or
              financial consequences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Report Title <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!scanResult || scanResult.hasPII}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface h-9 px-3 disabled:cursor-not-allowed"
                placeholder="e.g., Unpatched Core Database Storage Vulnerability"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Enterprise Dimension <span className="text-error">*</span>
              </label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!scanResult || scanResult.hasPII}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface h-9 px-3 disabled:cursor-not-allowed capitalize"
              >
                <option value="financial">Financial Risk</option>
                <option value="operational">Operational Risk</option>
                <option value="technological">Technological Risk</option>
                <option value="legal_compliance">
                  Legal & Regulatory Risk
                </option>
                <option value="strategic">Strategic Risk</option>
                <option value="market">Market Risk</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface">
              Frontline Observation & Risk Rationale{" "}
              <span className="text-error">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!scanResult || scanResult.hasPII}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface p-3 resize-y disabled:cursor-not-allowed"
              placeholder="State what could happen over the next 12 months if unmitigated..."
            />
          </div>

          {/* Submission Notice */}
          {message && (
            <div
              className={`p-3.5 rounded-lg flex items-center gap-2 text-xs font-semibold ${
                message.type === "success"
                  ? "bg-primary-container/20 text-on-surface border border-primary/30"
                  : "bg-error-container/30 text-error border border-error/30"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {message.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{message.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="submit"
              disabled={
                !scanResult ||
                scanResult.hasPII ||
                submitting ||
                !title ||
                !description
              }
              className={`px-5 py-2 rounded-lg text-xs font-bold text-on-secondary flex items-center gap-1.5 transition-all shadow-xs ${
                !scanResult ||
                scanResult.hasPII ||
                submitting ||
                !title ||
                !description
                  ? "bg-surface-container text-on-surface-variant opacity-50 cursor-not-allowed"
                  : "bg-secondary text-on-secondary hover:bg-secondary/90 cursor-pointer"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                send
              </span>
              {submitting
                ? "Submitting to Database..."
                : "Submit to Risk Officer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
