import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface Submission {
  id: number;
  title: string;
  category: string;
  description: string;
  filename: string;
  pii_clean: boolean;
  submitted_by_name: string;
  status: "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
  created_at: string;
  ai_prediction?: any;
  custom_rules_applied?: string | null;
  decision_notes?: string;
}

export default function RiskOfficerReview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);

  // Dynamic Rule Inputs
  const [ruleCategory, setRuleCategory] = useState<string>("loan_portfolio");
  const [primaryLimit, setPrimaryLimit] = useState("2500000");
  const [secondaryTolerance, setSecondaryTolerance] = useState("8.0");
  const [customRuleNotes, setCustomRuleNotes] = useState("");

  // AI Processing Modal & Animation states
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [processingDone, setProcessingDone] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/risk/submissions");

      if (res.ok) {
        const subData = await res.json();
        setSubmissions(subData);
        if (subData.length > 0 && !selectedSub) {
          setSelectedSub(subData[0]);
        }
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setRuleCategory(cat);
    if (cat === "expense_tracking") {
      setPrimaryLimit("1200000");
      setSecondaryTolerance("10.0");
      setCustomRuleNotes(
        "1. Flag any single expense line item exceeding 1,200,000 Rwf.\n2. If cumulative monthly spend exceeds department budget by overrun tolerance, trigger cash burn alert.",
      );
    } else if (cat === "liquidity_buffer") {
      setPrimaryLimit("50000000");
      setSecondaryTolerance("20.0");
      setCustomRuleNotes(
        "1. If net monthly cash outflows exceed statutory thresholds, model 12-month reserve depletion.\n2. Maintain minimum liquid cash buffer against total deposits at all times.",
      );
    } else {
      setPrimaryLimit("2500000");
      setSecondaryTolerance("8.0");
      setCustomRuleNotes(
        "1. Flag any uncollateralized borrower requesting over 2,500,000 Rwf.\n2. If historic default rate in client sector exceeds 8.0%, require verified guarantors.",
      );
    }
  };

  // Run Gemini AI prediction with Live Step-by-Step Processing Animation
  const handleRunPrediction = async () => {
    if (!selectedSub) return;

    setShowProcessingModal(true);
    setProcessingStep(1);
    setProcessingDone(false);
    setProcessingError(null);
    setPredictionResult(null);

    const consolidatedRules =
      customRuleNotes ||
      `[Activity Rule Set] Threshold: ${primaryLimit} Rwf, Tolerance: ${secondaryTolerance}%`;

    // Step 1 -> Step 2 timer
    const t1 = setTimeout(() => setProcessingStep(2), 1200);
    const t2 = setTimeout(() => setProcessingStep(3), 2600);

    try {
      const res = await fetch(
        `/api/v1/risk/submissions/${selectedSub.id}/predict`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customRules: consolidatedRules }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "AI prediction failed");
      }

      const data = await res.json();
      setProcessingStep(4);

      setTimeout(() => {
        setPredictionResult(data.prediction);
        setProcessingDone(true);
        const updatedSub = {
          ...selectedSub,
          ai_prediction: data.prediction,
          custom_rules_applied: consolidatedRules,
        };
        setSelectedSub(updatedSub);
        setSubmissions((prev) =>
          prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)),
        );
      }, 1000);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setProcessingError(err.message || "Error executing AI prediction");
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-2">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-on-surface text-center">
            Risk Officer Decision Desk
          </h2>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Submissions Queue (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-bright flex justify-between items-center">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Submissions Queue
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-container/10 text-primary-container">
              {submissions.length} Total
            </span>
          </div>

          <div className="divide-y divide-outline-variant/60 max-h-[650px] overflow-y-auto">
            {submissions.map((sub) => {
              const isSelected = selectedSub?.id === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSub(sub)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-surface-container border-l-4 border-secondary"
                      : "hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      {sub.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sub.status === "CONFIRMED"
                          ? "bg-tertiary-fixed-dim/30 text-on-tertiary-container"
                          : sub.status === "REJECTED"
                            ? "bg-error-container text-on-error-container"
                            : "bg-secondary-container/30 text-secondary"
                      }`}
                    >
                      {sub.status.replace("_", " ")}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-on-surface line-clamp-2">
                    {sub.title}
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                    {sub.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        person
                      </span>
                      {sub.submitted_by_name?.split(" ")[0] || "Staff"}
                    </span>
                    <span className="flex items-center gap-1 font-data-mono">
                      <span className="material-symbols-outlined text-[14px]">
                        attachment
                      </span>
                      {sub.filename}
                    </span>
                  </div>
                </div>
              );
            })}

            {submissions.length === 0 && (
              <div className="p-8 text-center text-xs text-on-surface-variant">
                No submissions in the queue.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Custom Rules & AI Predictor (8 cols) */}
        {selectedSub ? (
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* 1. Evidence Overview Card */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs p-6">
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                    Submission #{selectedSub.id} •{" "}
                    {selectedSub.category.toUpperCase()}
                  </span>
                  <h3 className="text-lg font-bold text-on-surface mt-0.5">
                    {selectedSub.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Reported by{" "}
                    <strong className="text-on-surface">
                      {selectedSub.submitted_by_name || "Staff"}
                    </strong>{" "}
                    on {new Date(selectedSub.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Employee statement */}
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/60">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                  Reported Rationale:
                </p>
                <p className="text-xs text-on-surface italic">
                  "{selectedSub.description}"
                </p>
                <div className="mt-2.5 pt-2 border-t border-outline-variant/40 text-[11px] text-on-surface-variant">
                  <span>
                    Attached File:{" "}
                    <strong className="text-on-surface">
                      {selectedSub.filename}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Custom Underwriting Rules Configurator */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      tune
                    </span>
                    Configure Multi-Activity Risk Rules for AI
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Select the operational activity category and fine-tune
                    threshold limits.
                  </p>
                </div>

                {/* Activity Category Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-on-surface-variant shrink-0">
                    Activity:
                  </span>
                  <select
                    value={ruleCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-secondary/40 bg-surface-container-low text-xs font-bold text-on-surface focus:outline-none focus:border-secondary shadow-2xs cursor-pointer"
                  >
                    <option value="loan_portfolio">
                      Loan Portfolio & Credit
                    </option>
                    <option value="expense_tracking">
                      Expense & Budget Burn
                    </option>
                    <option value="liquidity_buffer">
                      Liquidity & Cash Buffer
                    </option>
                  </select>
                </div>
              </div>

              {/* Dynamic Threshold Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface">
                    {ruleCategory === "expense_tracking"
                      ? "Single Expense Cap (Rwf)"
                      : ruleCategory === "liquidity_buffer"
                        ? "Min Liquidity Floor (Rwf)"
                        : "Max Exposure Cap (Rwf)"}
                  </label>
                  <input
                    type="number"
                    value={primaryLimit}
                    onChange={(e) => setPrimaryLimit(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface">
                    {ruleCategory === "expense_tracking"
                      ? "Budget Overrun Tolerance (%)"
                      : ruleCategory === "liquidity_buffer"
                        ? "Reserve Buffer Ratio (%)"
                        : "Default Rate Tolerance (%)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={secondaryTolerance}
                    onChange={(e) => setSecondaryTolerance(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">
                  Consolidated AI Directive Prompt:
                </label>
                <textarea
                  rows={4}
                  value={customRuleNotes}
                  onChange={(e) => setCustomRuleNotes(e.target.value)}
                  className="p-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface resize-y font-mono text-[11px]"
                  placeholder="Enter custom instructions the AI must follow..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {selectedSub.ai_prediction ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/officer/assessment/${selectedSub.id}`)
                    }
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View existing analytics page</span>
                    <span className="material-symbols-outlined text-[16px]">
                      arrow_forward
                    </span>
                  </button>
                ) : (
                  <div></div>
                )}

                <button
                  type="button"
                  onClick={handleRunPrediction}
                  className="px-6 py-2.5 rounded-lg text-xs font-bold bg-primary-container text-on-primary hover:bg-primary-container/90 flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    psychology
                  </span>
                  Run Gemini AI Prediction
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 bg-surface-container-lowest rounded-xl border border-outline-variant text-center text-on-surface-variant">
            <p className="text-sm font-bold text-on-surface">
              Select a submission from the queue to review
            </p>
          </div>
        )}
      </div>

      {/* ================= COOL AI PROCESSING MODAL ================= */}
      {showProcessingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px] animate-spin">
                    {processingDone ? "check_circle" : "autorenew"}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">
                    {processingDone
                      ? "AI Assessment Complete!"
                      : "Gemini AI Processing Evidence"}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    {processingDone
                      ? "Structured predictive risk report ready"
                      : "Analyzing dataset against underwriting parameters"}
                  </p>
                </div>
              </div>
            </div>

            {/* Error State */}
            {processingError ? (
              <div className="my-6 p-4 rounded-xl bg-error-container/30 border border-error/30 text-xs font-medium text-on-error-container flex items-start gap-2.5">
                <span className="material-symbols-outlined text-error text-[20px]">
                  error
                </span>
                <div className="flex-1">
                  <p className="font-bold text-sm">Processing Error</p>
                  <p className="mt-0.5">{processingError}</p>
                  <button
                    onClick={() => setShowProcessingModal(false)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-error text-on-error text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="my-6 space-y-4">
                {/* Live Step Progress Checklist */}
                <div className="space-y-3 text-xs">
                  <div
                    className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                      processingStep >= 1
                        ? "bg-surface-container-low border-secondary/40 text-on-surface"
                        : "opacity-40 border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      {processingStep > 1 ? "check_circle" : "sync"}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold">
                        Step 1: Reading & Parsing Document Rows
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Extracting amounts, transactions, and historical data
                        points.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                      processingStep >= 2
                        ? "bg-surface-container-low border-secondary/40 text-on-surface"
                        : "opacity-40 border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      {processingStep > 2
                        ? "check_circle"
                        : processingStep === 2
                          ? "sync"
                          : "radio_button_unchecked"}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold">
                        Step 2: Evaluating Underwriting Rules
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Checking limit ({primaryLimit} Rwf) & tolerance (
                        {secondaryTolerance}%).
                      </p>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                      processingStep >= 3
                        ? "bg-surface-container-low border-secondary/40 text-on-surface"
                        : "opacity-40 border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      {processingStep > 3
                        ? "check_circle"
                        : processingStep === 3
                          ? "sync"
                          : "radio_button_unchecked"}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold">
                        Step 3: Calculating 12-Month Predictive Modeling
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Simulating default acceleration trajectory and cash flow
                        impact.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                      processingStep >= 4
                        ? "bg-surface-container-low border-secondary/40 text-on-surface"
                        : "opacity-40 border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      {processingDone ? "check_circle" : "sync"}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold">
                        Step 4: Synthesizing ERI Score & Strategy
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Generating actionable mitigation plan in Rwandan Francs
                        (Rwf).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Completion Action */}
                {processingDone && selectedSub && (
                  <div className="pt-4 border-t border-outline-variant flex justify-end gap-3 animate-in fade-in duration-300">
                    <button
                      type="button"
                      onClick={() => setShowProcessingModal(false)}
                      className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProcessingModal(false);
                        navigate(`/officer/assessment/${selectedSub.id}`);
                      }}
                      className="px-5 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>View Full Assessment & Analytics Page</span>
                      <span className="material-symbols-outlined text-[16px]">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
