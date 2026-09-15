import React, { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  api,
  AssessmentDetailsResponse,
  IdentifiedRisk,
  AIRecommendation,
} from "../lib/api";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Send,
  Plus,
  HelpCircle,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Scale,
  ListTodo,
  User,
  Calculator,
} from "lucide-react";
import { MitigationSimulatorModal } from "../components/ui/MitigationSimulatorModal";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";

export default function AssessmentDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "executive";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [data, setData] = useState<AssessmentDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Traceable Evidence Drawer
  const [expandedRiskId, setExpandedRiskId] = useState<number | null>(null);

  // What-If Simulator State
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorRisk, setSimulatorRisk] = useState<IdentifiedRisk | null>(
    null,
  );

  // Convert Recommendation to Mitigation Modal
  const [modalRec, setModalRec] = useState<AIRecommendation | null>(null);
  const [convertedRecIds, setConvertedRecIds] = useState<number[]>([]);
  const [mitTitle, setMitTitle] = useState("");
  const [mitDesc, setMitDesc] = useState("");
  const [mitPriority, setMitPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  >("HIGH");
  const [mitAssignee, setMitAssignee] = useState("Risk Operations Lead");
  const [mitDept, setMitDept] = useState("Operations");
  const [mitDueDate, setMitDueDate] = useState("");
  const [mitSaving, setMitSaving] = useState(false);

  // AI Advisor State
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content:
        "Hello! I am your AI Risk Advisor. I am grounded directly in this assessment's verified data, scores, and evidence. Ask me any question about risks, category drivers, or mitigation priorities.",
    },
  ]);
  const [advisorInput, setAdvisorInput] = useState("");
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getAssessment(id!);
      setData(res);
      const converted =
        res.recommendations?.filter((r) => r.is_converted).map((r) => r.id) ||
        [];
      setConvertedRecIds(converted);
      if (
        ["PROCESSING", "EXTRACTING", "ASSESSING", "ANALYZING"].includes(
          res.assessment.status,
        )
      ) {
        pollStatus();
      }
    } catch (err: any) {
      setError(err.message || "Failed to load assessment details");
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await api.getAssessment(id!);
        setData(res);
        const converted =
          res.recommendations?.filter((r) => r.is_converted).map((r) => r.id) ||
          [];
        setConvertedRecIds(converted);
        if (
          res.assessment.status === "COMPLETED" ||
          res.assessment.status === "FAILED"
        ) {
          clearInterval(interval);
          setProcessing(false);
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 3000);
  };

  const handleRunPipeline = async () => {
    if (!id) return;
    try {
      setProcessing(true);
      await api.processAssessment(parseInt(id, 10));
      pollStatus();
    } catch (err: any) {
      alert(`Error starting pipeline: ${err.message}`);
      setProcessing(false);
    }
  };

  const openMitigationModal = (rec: AIRecommendation) => {
    setModalRec(rec);
    setMitTitle(rec.title);
    setMitDesc(rec.recommendation_text);
    setMitPriority(rec.priority === "IMMEDIATE" ? "CRITICAL" : "HIGH");
    setMitDueDate("");
  };

  const handleCreateMitigationFromRec = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !modalRec) return;
    try {
      setMitSaving(true);
      await api.createMitigation({
        assessment_id: Number(data.assessment.id || id),
        identified_risk_id: modalRec.identified_risk_id,
        recommendation_id: modalRec.id,
        title: mitTitle,
        action_description: mitDesc,
        priority: mitPriority,
        assigned_to: mitAssignee,
        department: mitDept,
        due_date: mitDueDate || undefined,
        expected_outcome: modalRec.expected_outcome,
      });
      setConvertedRecIds((prev) => [...prev, modalRec.id]);
      setModalRec(null);
      await fetchDetails();
    } catch (err: any) {
      alert(`Failed to create mitigation: ${err.message}`);
    } finally {
      setMitSaving(false);
    }
  };

  const handleSendAdvisorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorInput.trim() || !id || advisorLoading) return;

    const userQ = advisorInput.trim();
    setAdvisorInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: userQ }]);
    setAdvisorLoading(true);

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const response = await api.askAdvisor({
        assessmentId: parseInt(id, 10),
        question: userQ,
        chatHistory: history,
      });

      const cleanAnswer = (response.answer || "")
        .replace(/#{1,6}\s*/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/_{1,2}(.*?)_{1,2}/g, "$1")
        .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
        .replace(/^[\s*#-]+\s+/gm, "• ")
        .trim();

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            cleanAnswer ||
            "This information is not available in the uploaded assessment document.",
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Unable to query AI Advisor at this time: ${err.message || "Please try again."}`,
        },
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const getEriBadgeBg = (classification?: string) => {
    switch (classification) {
      case "Very Low":
      case "Low":
        return "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40 font-bold";
      case "Moderate":
        return "bg-secondary/15 text-secondary border-secondary/30 font-bold";
      case "High":
      case "Critical":
      default:
        return "bg-error-container text-on-error-container border-error/40 font-bold";
    }
  };

  const getInherentBadge = (score: number) => {
    if (score <= 5)
      return "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40";
    if (score <= 10)
      return "bg-secondary/15 text-secondary border-secondary/30";
    if (score <= 16)
      return "bg-secondary-container/30 text-primary border-secondary-container";
    return "bg-error-container text-on-error-container border-error/40 font-bold";
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-primary">
        <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-bold">
          Loading Enterprise Risk Workspace...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant space-y-3">
        <AlertTriangle className="w-10 h-10 text-error mx-auto" />
        <p className="text-sm font-bold text-primary">
          {error || "Assessment not found"}
        </p>
        <Link
          to="/assessments"
          className="text-xs font-bold text-secondary hover:underline inline-block"
        >
          Return to Assessments Repository
        </Link>
      </div>
    );
  }

  const {
    assessment,
    document,
    extractedFacts,
    identifiedRisks,
    riskScores,
    aiAnalysis,
    recommendations,
  } = data;

  const isCompleted = assessment.status === "COMPLETED";
  const isRunning =
    ["PROCESSING", "EXTRACTING", "ASSESSING", "ANALYZING"].includes(
      assessment.status,
    ) || processing;
  const isFailed = assessment.status === "FAILED";

  const radarData = riskScores.map((c) => ({
    category: c.category_name?.replace(" Risk", "") || c.category_code,
    score: Number(c.category_score),
    fullMark: 100,
  }));

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{assessment.org_name || "Enterprise"}</span>
              </span>
              <span className="text-xs font-bold text-primary">•</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant">
                ID #{assessment.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              {assessment.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-primary pt-1">
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-secondary" />
                <strong className="text-primary">Document:</strong>{" "}
                {document?.original_name || "No document"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-secondary" />
                {new Date(assessment.created_at).toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="font-bold text-secondary">
                Single-Document Rule Enforced
              </span>
            </div>
          </div>

          {/* Right Side: ERI Score & Action */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {isCompleted && (
              <div className="text-left sm:text-right px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant">
                <p className="text-xs uppercase tracking-wider font-extrabold text-primary">
                  Calculated ERI
                </p>
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className="text-2xl font-black text-primary">
                    {Number(assessment.overall_eri || 0).toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    / 100
                  </span>
                  <span
                    className={`ml-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${getEriBadgeBg(assessment.eri_classification)}`}
                  >
                    {assessment.eri_classification}
                  </span>
                </div>
              </div>
            )}

            {(!isCompleted || isFailed) && (
              <button
                onClick={handleRunPipeline}
                disabled={isRunning}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`}
                />
                <span>
                  {isRunning
                    ? "Processing Pipeline..."
                    : isFailed
                      ? "Retry Assessment"
                      : "Start Assessment"}
                </span>
              </button>
            )}

            {isCompleted && (
              <Link
                to={`/reports?assessmentId=${assessment.id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant hover:bg-surface-container-high text-xs font-bold text-primary transition-colors"
              >
                <FileText className="w-4 h-4 text-secondary" />
                <span>View Report</span>
              </Link>
            )}
          </div>
        </div>

        {/* Real-Time Pipeline Progress Indicator */}
        {isRunning && (
          <div className="mt-5 pt-4 border-t border-outline-variant">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-bold text-secondary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                Status: {assessment.status} ({assessment.progress_step})
              </span>
              <span className="text-primary font-semibold">
                Deterministic Engine & Gemini AI Working...
              </span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div className="h-full bg-secondary rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="mt-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-center gap-2 border border-error/40">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Processing failed:{" "}
              {assessment.failure_reason || "Unknown error occurred"}
            </span>
          </div>
        )}
      </div>

      {/* Single Client / User Target Profile Summary Card */}
      {(assessment.target_type === "SINGLE_USER" || assessment.client_name) && (
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-secondary block">
                  Assessed Individual Subject
                </span>
                <h3 className="text-sm font-black text-primary">
                  {assessment.client_name || "Individual Client"}
                </h3>
              </div>
            </div>

            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
              Single Client Profile
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                Client Number / Reference #
              </span>
              <p className="font-extrabold text-primary font-mono mt-0.5">
                {assessment.client_identifier || "Not Specified"}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                Applied Risk Rule Engine
              </span>
              <p className="font-extrabold text-secondary mt-0.5">
                {assessment.rule_group_name ||
                  "Standard Individual Credit Rules"}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                Data Privacy & Governance
              </span>
              <p className="font-bold text-tertiary mt-0.5 flex items-center gap-1 text-[11px]">
                <span>Stored in DB only • Zero PII to AI</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Tabs Navigation (Scrollable on small screens) */}
      <div className="flex border-b border-outline-variant gap-1 sm:gap-2 overflow-x-auto no-scrollbar whitespace-nowrap -mx-4 sm:mx-0 px-4 sm:px-0">
        <button
          onClick={() => {
            setActiveTab("executive");
            setSearchParams({ tab: "executive" });
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "executive"
              ? "border-secondary text-secondary bg-surface-container-lowest rounded-t-xl shadow-xs font-black"
              : "border-transparent text-primary hover:text-secondary"
          }`}
        >
          <Sparkles className="w-4 h-4 text-secondary" />
          <span>Executive Intelligence</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("scores");
            setSearchParams({ tab: "scores" });
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "scores"
              ? "border-secondary text-secondary bg-surface-container-lowest rounded-t-xl shadow-xs font-black"
              : "border-transparent text-primary hover:text-secondary"
          }`}
        >
          <Scale className="w-4 h-4 text-secondary" />
          <span>Deterministic ERI Scores ({riskScores.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("risks");
            setSearchParams({ tab: "risks" });
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "risks"
              ? "border-secondary text-secondary bg-surface-container-lowest rounded-t-xl shadow-xs font-black"
              : "border-transparent text-primary hover:text-secondary"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-secondary" />
          <span>Identified Risks & Evidence ({identifiedRisks.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("controls");
            setSearchParams({ tab: "controls" });
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "controls"
              ? "border-secondary text-secondary bg-surface-container-lowest rounded-t-xl shadow-xs font-black"
              : "border-transparent text-primary hover:text-secondary"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-secondary" />
          <span>Controls Evaluation</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("recommendations");
            setSearchParams({ tab: "recommendations" });
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "recommendations"
              ? "border-secondary text-secondary bg-surface-container-lowest rounded-t-xl shadow-xs font-black"
              : "border-transparent text-primary hover:text-secondary"
          }`}
        >
          <ListTodo className="w-4 h-4 text-secondary" />
          <span>AI Recommendations ({recommendations.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("advisor");
            setSearchParams({ tab: "advisor" });
          }}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
            activeTab === "advisor"
              ? "border-secondary text-secondary bg-surface-container-lowest rounded-t-xl shadow-xs font-black"
              : "border-transparent text-primary hover:text-secondary"
          }`}
        >
          <HelpCircle className="w-4 h-4 text-secondary" />
          <span>Grounded AI Advisor</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE BRIEFING & AI ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === "executive" && (
        <div className="space-y-6">
          {aiAnalysis ? (
            <>
              {/* Executive Summary Card */}
              <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  <h2 className="text-base font-bold text-primary">
                    Board Executive Summary
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line font-medium">
                  {aiAnalysis.executive_summary}
                </p>
              </div>

              {/* Risk Position Overview & Strategic Outlook */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-primary">
                    Organizational Risk Position & Resilience
                  </h3>
                  <p className="text-xs text-on-surface leading-relaxed font-medium">
                    {aiAnalysis.risk_position_overview ||
                      "No additional position narrative generated."}
                  </p>
                </div>

                <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-primary">
                    Strategic Implications (12 - 24 Month Horizon)
                  </h3>
                  <p className="text-xs text-on-surface leading-relaxed font-medium">
                    {aiAnalysis.strategic_implications ||
                      "Maintain vigilance over unmitigated high-residual risks."}
                  </p>
                </div>
              </div>

              {/* Top Risk Drivers */}
              {aiAnalysis.top_risk_drivers &&
                aiAnalysis.top_risk_drivers.length > 0 && (
                  <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-primary">
                      Top Identified Risk Drivers
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {aiAnalysis.top_risk_drivers.map(
                        (driver: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] uppercase font-black text-secondary">
                                {driver.category}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-primary">
                              {driver.driver_title}
                            </h4>
                            <p className="text-xs text-on-surface leading-normal font-medium">
                              {driver.impact_summary}
                            </p>
                            {driver.supporting_evidence && (
                              <div className="pt-2 border-t border-outline-variant text-[11px] text-primary italic font-medium">
                                "{driver.supporting_evidence}"
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </>
          ) : (
            <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant text-center space-y-3">
              <Sparkles className="w-10 h-10 mx-auto text-secondary opacity-60" />
              <p className="text-sm font-bold text-primary">
                AI Executive Analysis Pending
              </p>
              <p className="text-xs font-medium text-on-surface-variant">
                Launch the assessment pipeline to trigger fact extraction,
                deterministic scoring, and executive analysis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETERMINISTIC RISK SCORING & CATEGORY BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === "scores" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Table */}
            <div className="lg:col-span-7 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
              <div className="mb-4">
                <h2 className="text-base font-bold text-primary">
                  Deterministic Category Scores & Weights
                </h2>
                <p className="text-xs font-medium text-on-surface-variant">
                  Formula: ERI = Sum(Category Score × Category Weight) /
                  Sum(Weight)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-primary font-black">
                      <th className="py-3 px-4 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold text-right">
                        Score (0-100)
                      </th>
                      <th className="py-3 px-3 font-bold text-right">Weight</th>
                      <th className="py-3 px-4 font-bold text-right">
                        Weighted Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {riskScores.map((cat) => (
                      <tr
                        key={cat.id}
                        className="hover:bg-surface-container-low"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-primary">
                            {cat.category_name}
                          </p>
                          <p className="text-xs text-on-surface-variant font-medium">
                            {cat.category_desc}
                          </p>
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-primary">
                          {Number(cat.category_score).toFixed(1)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-primary">
                          {Number(cat.category_weight)}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-secondary">
                          {Number(cat.weighted_score).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary font-bold text-sm bg-surface-container-low">
                      <td className="py-3.5 px-4 text-primary font-black">
                        Enterprise Risk Index (ERI)
                      </td>
                      <td
                        colSpan={2}
                        className="py-3.5 px-3 text-right text-xs text-primary font-bold"
                      >
                        Classification:{" "}
                        <strong>{assessment.eri_classification}</strong>
                      </td>
                      <td className="py-3.5 px-4 text-right text-primary text-base font-black">
                        {Number(assessment.overall_eri || 0).toFixed(1)} / 100
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {assessment.eri_explanation && (
                <div className="mt-4 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 font-mono leading-relaxed">
                  <span className="font-sans font-bold text-indigo-900 block mb-1 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    Enterprise Risk Index Mathematical Breakdown:
                  </span>
                  {assessment.eri_explanation}
                </div>
              )}
            </div>

            {/* Radar Chart */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
              <div className="mb-2">
                <h3 className="text-base font-bold text-primary">
                  Multidimensional Footprint
                </h3>
                <p className="text-xs font-medium text-on-surface-variant">
                  Normalized 0–100 scale across all 5 enterprise domains
                </p>
              </div>

              <div className="h-[280px] w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: "#4b5563", fontSize: 10, fontWeight: 600 }}
                    />
                    <Radar
                      name="Category Score"
                      dataKey="score"
                      stroke="#854d0e"
                      fill="#ffba4b"
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-primary font-semibold border border-outline-variant">
                <strong>Governance Rule:</strong> Category scores are computed
                deterministically from residual risk values and never generated
                arbitrarily by AI.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IDENTIFIED RISKS & TRACEABLE EVIDENCE */}
      {/* ========================================================================= */}
      {activeTab === "risks" && (
        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-primary">
              Identified Risks & Traceable Evidence Register
            </h2>
            <p className="text-xs font-medium text-on-surface-variant">
              Every identified risk links directly to extracted document facts,
              deterministic rules, and exact page/sheet citations.
            </p>
          </div>

          <div className="space-y-3">
            {identifiedRisks.map((risk) => {
              const isExpanded = expandedRiskId === risk.id;
              return (
                <div
                  key={risk.id}
                  className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low transition-all"
                >
                  <div
                    onClick={() =>
                      setExpandedRiskId(isExpanded ? null : risk.id)
                    }
                    className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-surface-container transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant">
                          {risk.category_name || risk.category_code}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getEriBadgeBg(risk.residual_classification)}`}
                        >
                          {risk.residual_classification} (Residual:{" "}
                          {Number(risk.residual_risk).toFixed(1)})
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-primary">
                        {risk.risk_name}
                      </h4>
                      <p className="text-xs text-on-surface line-clamp-1 font-medium">
                        {risk.risk_description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <div className="text-right text-xs">
                        <span className="font-black text-primary text-sm">
                          {Number(risk.residual_risk).toFixed(1)}
                        </span>
                        <span className="text-[11px] text-on-surface font-semibold block">
                          Residual Score
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSimulatorRisk(risk);
                          setSimulatorOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Simulate
                      </button>
                      <button className="p-1 rounded-lg hover:bg-surface-container text-primary">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Traceability Drawer */}
                  {isExpanded && (
                    <div className="p-5 border-t border-outline-variant bg-surface-container-lowest space-y-4">
                      {/* Math Pipeline Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                          <span className="text-[10px] uppercase font-bold text-primary">
                            Likelihood
                          </span>
                          <p className="text-base font-black text-primary mt-0.5">
                            {risk.likelihood} / 5
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                          <span className="text-[10px] uppercase font-bold text-primary">
                            Impact
                          </span>
                          <p className="text-base font-black text-primary mt-0.5">
                            {risk.impact} / 5
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                          <span className="text-[10px] uppercase font-bold text-primary">
                            Inherent Risk (L × I)
                          </span>
                          <p className="text-base font-black text-primary mt-0.5">
                            {risk.inherent_risk} / 25
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                          <span className="text-[10px] uppercase font-bold text-primary">
                            Control Effectiveness
                          </span>
                          <p className="text-base font-black text-secondary mt-0.5">
                            {risk.control_score}%
                          </p>
                        </div>
                      </div>

                      {/* Plain Language Mathematical Explainability */}
                      {risk.explanation && (
                        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 font-mono leading-relaxed">
                          <span className="font-sans font-bold text-indigo-900 block mb-1 flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                            Mathematical Explainability Breakdown:
                          </span>
                          {risk.explanation}
                        </div>
                      )}

                      {/* Evidence Citations */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black uppercase text-primary">
                          Verbatim Document Evidence Quotes:
                        </h5>
                        {risk.evidence_list && risk.evidence_list.length > 0 ? (
                          risk.evidence_list.map((ev: any) => (
                            <div
                              key={ev.id}
                              className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant space-y-1.5 text-xs"
                            >
                              <blockquote className="italic text-primary border-l-3 border-secondary pl-3 font-medium">
                                "{ev.evidence_text}"
                              </blockquote>
                              <div className="flex flex-wrap items-center justify-between text-[11px] text-on-surface font-semibold pt-1">
                                <span>
                                  Source Reference:{" "}
                                  <strong>
                                    {ev.source_location || "Uploaded Document"}
                                  </strong>
                                </span>
                                {ev.extracted_value && (
                                  <span>
                                    Extracted Value:{" "}
                                    <strong>{ev.extracted_value}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-primary font-medium">
                            No verbatim quotes cited for this item.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INTERNAL CONTROLS EVALUATION */}
      {/* ========================================================================= */}
      {activeTab === "controls" && (
        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-primary">
              Internal Controls & Mitigation Defenses
            </h2>
            <p className="text-xs font-medium text-on-surface-variant">
              Internal controls extracted from the document reduce Inherent Risk
              to Residual Risk. If no controls are mentioned, ERIDSS flags
              "INSUFFICIENT DATA".
            </p>
          </div>

          <div className="space-y-3">
            {identifiedRisks.map((risk) => (
              <div
                key={risk.id}
                className="p-4 rounded-xl border border-outline-variant bg-surface-container-low space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant">
                      {risk.category_code}
                    </span>
                    <strong className="text-sm font-bold text-primary">
                      {risk.risk_name}
                    </strong>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      risk.control_status === "EVALUATED"
                        ? "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40"
                        : "bg-surface-container text-primary border-outline-variant"
                    }`}
                  >
                    {risk.control_status === "EVALUATED"
                      ? `${risk.control_score}% Effectiveness`
                      : "INSUFFICIENT DATA"}
                  </span>
                </div>

                <p className="text-xs text-on-surface font-medium leading-relaxed">
                  {risk.controls_list && risk.controls_list.length > 0
                    ? risk.controls_list
                        .map(
                          (c) =>
                            `${c.control_name} (${c.effectiveness_pct}% effectiveness) - ${c.source_evidence || ""}`,
                        )
                        .join(" | ")
                    : risk.explanation ||
                      "No formal internal control mechanisms or defensive safeguards detected in the source document."}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-primary">
                  <span>
                    Inherent: <strong>{risk.inherent_risk}/25</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Control Deduction: <strong>-{risk.control_score}%</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Residual:{" "}
                    <strong className="text-secondary">
                      {Number(risk.residual_risk).toFixed(1)}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AI RECOMMENDATIONS & DECISION ROADMAP */}
      {/* ========================================================================= */}
      {activeTab === "recommendations" && (
        <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-primary">
                Strategic AI Recommendations
              </h2>
              <p className="text-xs font-medium text-on-surface-variant">
                Prioritized remediation actions generated by Gemini AI. Convert
                any recommendation into a managed mitigation action.
              </p>
            </div>
            <Link
              to="/mitigations"
              className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline shrink-0"
            >
              <span>View Active Mitigations</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-xl border border-outline-variant bg-surface-container-low space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        rec.priority === "IMMEDIATE"
                          ? "bg-error-container text-on-error-container border-error/40"
                          : rec.priority === "SHORT_TERM"
                            ? "bg-secondary-container/20 text-secondary border-secondary-container/40"
                            : "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40"
                      }`}
                    >
                      {rec.priority.replace("_", " ")}
                    </span>
                    <span className="text-xs text-primary font-bold">
                      {rec.suggested_timeframe}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-primary">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-on-surface leading-relaxed font-medium">
                    {rec.recommendation_text}
                  </p>

                  {rec.expected_outcome && (
                    <div className="p-2.5 rounded-lg bg-surface-container text-xs text-primary font-medium">
                      <strong>Expected Outcome:</strong> {rec.expected_outcome}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-outline-variant">
                  {rec.is_converted || convertedRecIds.includes(rec.id) ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container text-on-surface-variant font-bold text-xs border border-outline-variant cursor-not-allowed opacity-80"
                    >
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                      <span>Converted to Mitigation Action</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => openMitigationModal(rec)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Convert to Mitigation Action</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: GROUNDED AI RISK ADVISOR (CHAT) */}
      {/* ========================================================================= */}
      {activeTab === "advisor" && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">
                  Contextual AI Risk Advisor
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Grounded strictly in Assessment #{assessment.id} data • No
                  speculative hallucination
                </p>
              </div>
            </div>

            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-tertiary-container/20 text-on-tertiary-container border border-tertiary-fixed-dim/40">
              Ask AI more
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-secondary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-primary text-on-primary font-medium"
                      : "bg-surface-container border border-outline-variant text-on-surface font-medium"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    Me
                  </div>
                )}
              </div>
            ))}
            {advisorLoading && (
              <div className="flex items-center gap-2 text-xs font-bold text-primary p-3">
                <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin"></div>
                <span>
                  Analyzing assessment facts & formulating decision guidance...
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendAdvisorMessage}
            className="p-3 sm:p-4 border-t border-outline-variant bg-surface-container-low flex gap-2"
          >
            <input
              type="text"
              value={advisorInput}
              onChange={(e) => setAdvisorInput(e.target.value)}
              placeholder="Ask about risk severity, root causes, evidence quotes, or remediation timelines..."
              className="flex-1 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs sm:text-sm font-medium text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={advisorLoading || !advisorInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Convert Recommendation to Mitigation Modal */}
      {modalRec && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase text-secondary">
                  Convert AI Recommendation to Task
                </span>
                <h3 className="text-base font-bold text-primary mt-0.5">
                  New Mitigation Action
                </h3>
              </div>
              <button
                onClick={() => setModalRec(null)}
                className="text-primary hover:text-error text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateMitigationFromRec}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Action Title
                </label>
                <input
                  type="text"
                  required
                  value={mitTitle}
                  onChange={(e) => setMitTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Remediation Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={mitDesc}
                  onChange={(e) => setMitDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={mitPriority}
                    onChange={(e: any) => setMitPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={mitDueDate}
                    onChange={(e) => setMitDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Assigned Lead
                  </label>
                  <input
                    type="text"
                    required
                    value={mitAssignee}
                    onChange={(e) => setMitAssignee(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={mitDept}
                    onChange={(e) => setMitDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setModalRec(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container font-bold text-primary cursor-pointer hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mitSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {mitSaving ? "Creating..." : "Create Mitigation Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* What-If Mitigation Impact Simulator Modal */}
      <MitigationSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        initialRisk={simulatorRisk}
      />
    </div>
  );
}
