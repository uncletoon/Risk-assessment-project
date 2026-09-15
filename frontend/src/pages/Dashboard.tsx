import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpRight,
  FilePlus2,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  ChevronRight,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const metrics = await api.getDashboard();
      setData(metrics);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-on-surface">
        <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-bold text-primary">
          Aggregating Enterprise Risk Intelligence...
        </p>
      </div>
    );
  }

  const latest = data?.latestAssessment;
  const eriScore =
    latest?.overall_eri !== undefined ? Number(latest.overall_eri) : 0;
  const classification = latest?.eri_classification || "Pending";
  const categoryScores = data?.categoryScores || [];
  const topRisks = data?.topRisks || [];
  const mitStats = data?.mitigationStats || {};
  const historyTrend = (data?.historyTrend || []).map((h: any) => ({
    label: h.version_label || `v${h.id}`,
    eri: Number(h.overall_eri),
    date: new Date(h.snapshot_date).toLocaleDateString(),
  }));

  // Prepare Radar Chart Data
  const radarData = categoryScores.map((c: any) => ({
    category: c.category_name?.replace(" Risk", "") || c.category_code,
    score: Number(c.category_score),
    fullMark: 100,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              {latest?.org_name || user?.organization_name || "Enterprise"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Enterprise Risk Intelligence Hub
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Deterministic mathematical risk calculation paired with Gemini AI
            strategic decision support.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link
            to="/assessments/new"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-sm transition-all cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>New Assessment</span>
          </Link>
          <Link
            to="/mitigations"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-primary text-xs font-bold hover:bg-surface-container-high transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-secondary" />
            <span>Mitigations</span>
          </Link>
        </div>
      </div>

      {/* Welcome & First Assessment Onboarding Card for New Businesses */}
      {!latest && (
        <div className="p-6 rounded-2xl bg-secondary/10 border-2 border-dashed border-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0 mx-auto sm:mx-0">
              <FilePlus2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-primary">
                Welcome to ERIDSS!
              </h3>
              <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                No risk assessments found for{" "}
                <strong>{user?.organization_name || "your enterprise"}</strong>{" "}
                yet. Upload your first business document to calculate your
                Enterprise Risk Index (ERI).
              </p>
            </div>
          </div>
          <Link
            to="/assessments/new"
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-sm transition-all shrink-0"
          >
            Create First Assessment →
          </Link>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: ERI Score */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider font-extrabold text-primary">
              Enterprise Risk Index
            </span>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getEriBadgeBg(classification)}`}
            >
              {classification}
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-primary tracking-tight">
              {latest ? eriScore.toFixed(1) : "--"}
            </span>
            <span className="text-xs font-bold text-on-surface-variant">
              / 100
            </span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                eriScore > 60
                  ? "bg-error"
                  : eriScore > 40
                    ? "bg-secondary-container"
                    : "bg-tertiary-fixed-dim"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, eriScore))}%` }}
            ></div>
          </div>
          <p className="text-xs font-semibold text-on-surface-variant mt-2 truncate">
            {latest
              ? `Latest: ${latest.title}`
              : "No completed assessments yet"}
          </p>
        </div>

        {/* Card 2: Identified Risks */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider font-extrabold text-primary">
              Identified Risks
            </span>
            <AlertTriangle className="w-4 h-4 text-secondary" />
          </div>
          <div className="my-3">
            <span className="text-4xl font-black text-primary tracking-tight">
              {topRisks.length > 0 ? topRisks.length : "--"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <span className="w-2 h-2 rounded-full bg-error shrink-0"></span>
            <span>
              {
                topRisks.filter(
                  (r: any) =>
                    r.residual_classification === "Critical" ||
                    r.residual_classification === "High",
                ).length
              }{" "}
              High / Critical Risks
            </span>
          </div>
          <p className="text-xs font-semibold text-on-surface-variant mt-2">
            Deterministic rule validation
          </p>
        </div>

        {/* Card 3: Mitigation Progress */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider font-extrabold text-primary">
              Mitigation Execution
            </span>
            <CheckCircle2 className="w-4 h-4 text-on-tertiary-container" />
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-primary tracking-tight">
              {Math.round(Number(mitStats.average_progress || 0))}%
            </span>
            <span className="text-xs font-bold text-on-surface-variant">
              ({mitStats.completed_count || 0} / {mitStats.total_actions || 0}{" "}
              Done)
            </span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-tertiary-fixed-dim rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(3, Number(mitStats.average_progress || 0)))}%`,
              }}
            ></div>
          </div>
          <p className="text-xs font-semibold text-on-surface-variant mt-2">
            {mitStats.in_progress_count || 0} tasks actively underway
          </p>
        </div>

        {/* Card 4: Document Governance */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase tracking-wider font-extrabold text-primary">
              Single-Doc Governance
            </span>
            <FileSpreadsheet className="w-4 h-4 text-primary" />
          </div>
          <div className="my-3">
            <span
              className="text-sm font-bold text-primary truncate block max-w-full"
              title={latest?.document_name}
            >
              {latest
                ? latest.document_name || "Processed File"
                : "No Document"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-on-surface">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>
              {latest?.completed_at
                ? new Date(latest.completed_at).toLocaleDateString()
                : "Awaiting upload"}
            </span>
          </div>
          <p className="text-xs font-semibold text-on-surface-variant mt-2">
            Strict 1-Document rule enforced
          </p>
        </div>
      </div>

      {/* Main Grid: Category Matrix & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-primary">
                5-Category Enterprise Risk Matrix
              </h2>
              <p className="text-xs font-medium text-on-surface-variant">
                Normalized category scores deterministically weighted to produce
                the ERI.
              </p>
            </div>
            {latest && (
              <Link
                to={`/assessments/${latest.id}`}
                className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline shrink-0"
              >
                <span>View Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {categoryScores.length > 0 ? (
            <div className="space-y-4 my-auto">
              {categoryScores.map((cat: any) => {
                const score = Number(cat.category_score);
                const weight = Number(cat.category_weight);
                return (
                  <div key={cat.category_code} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-primary">
                        {cat.category_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface-variant">
                          Weight: {weight}%
                        </span>
                        <span className="font-black text-primary">
                          {score.toFixed(1)} / 100
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score > 60
                            ? "bg-error"
                            : score > 40
                              ? "bg-secondary-container"
                              : "bg-tertiary-fixed-dim"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(3, score))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-on-surface-variant text-center my-auto">
              <Layers className="w-10 h-10 mb-2 opacity-50 text-secondary" />
              <p className="text-xs font-bold text-primary">
                No category assessment data available.
              </p>
              <Link
                to="/assessments/new"
                className="mt-3 text-xs font-extrabold text-secondary hover:underline"
              >
                Start your first assessment
              </Link>
            </div>
          )}
        </div>

        {/* Radar / Spider Chart (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-base font-bold text-primary">
              Enterprise Risk Radar Profile
            </h2>
            <p className="text-xs font-medium text-on-surface-variant">
              Multidimensional category exposure footprint
            </p>
          </div>

          <div className="h-[260px] w-full min-h-[220px]">
            {radarData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-bold text-on-surface-variant">
                No radar data available
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-outline-variant text-xs font-bold text-primary flex justify-between">
            <span>Scale: 0 (Negligible) - 100 (Severe)</span>
            <span className="text-secondary">Balanced Risk Stance</span>
          </div>
        </div>
      </div>

      {/* Top Critical Risks Table */}
      <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-primary">
              Priority Identified Risks & Traceable Evidence
            </h2>
            <p className="text-xs font-medium text-on-surface-variant">
              Every risk is calculated deterministically with direct verbatim
              document citations.
            </p>
          </div>
          {latest && (
            <Link
              to={`/assessments/${latest.id}`}
              className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline shrink-0"
            >
              <span>Explore All Risks ({topRisks.length})</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {topRisks.length > 0 ? (
          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-left border-collapse text-xs min-w-[650px]">
              <thead>
                <tr className="border-b border-outline-variant text-xs uppercase tracking-wider text-primary font-black bg-surface-container-low">
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Risk Factor</th>
                  <th className="py-3 px-2 text-center">Likelihood</th>
                  <th className="py-3 px-2 text-center">Impact</th>
                  <th className="py-3 px-2 text-center">Inherent</th>
                  <th className="py-3 px-3">Control Status</th>
                  <th className="py-3 px-2 text-center">Residual</th>
                  <th className="py-3 px-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {topRisks.map((risk: any) => (
                  <tr
                    key={risk.id}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-secondary">
                      {risk.category_name}
                    </td>
                    <td
                      className="py-3 px-3 font-bold text-primary max-w-[220px] truncate"
                      title={risk.risk_name}
                    >
                      {risk.risk_name}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-on-surface">
                      {risk.likelihood} / 5
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-on-surface">
                      {risk.impact} / 5
                    </td>
                    <td className="py-3 px-2 text-center font-extrabold text-primary">
                      {risk.inherent_risk} / 25
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          risk.control_status === "EVALUATED"
                            ? "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40"
                            : "bg-surface-container text-on-surface font-bold border-outline-variant"
                        }`}
                      >
                        {risk.control_status === "EVALUATED"
                          ? `${risk.control_score}% Effective`
                          : "Insufficient Data"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-black text-primary">
                      {Number(risk.residual_risk).toFixed(1)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getEriBadgeBg(risk.residual_classification)}`}
                      >
                        {risk.residual_classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-primary font-bold">
            No risks recorded. Upload a document to start an assessment.
          </div>
        )}
      </div>

      {/* Bottom Grid: Longitudinal Trends & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-base font-bold text-primary">
                Longitudinal Enterprise Risk Trajectory
              </h2>
              <p className="text-xs font-medium text-on-surface-variant">
                Tracking ERI across successive organizational assessments.
              </p>
            </div>
            <Link
              to="/history"
              className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Full History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-[220px] w-full min-h-[180px]">
            {historyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="eri"
                    stroke="#854d0e"
                    strokeWidth={3}
                    dot={{ fill: "#ffb22c", r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-bold text-on-surface-variant">
                History snapshots will populate as future assessments are
                completed.
              </div>
            )}
          </div>
        </div>

        {/* Quick Report & Decision Actions (4 cols) */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-primary mb-1">
              Executive Decision Support
            </h2>
            <p className="text-xs font-medium text-on-surface-variant mb-4">
              Export audit-ready reports or consult the grounded AI Risk
              Advisor.
            </p>

            <div className="space-y-3">
              {latest ? (
                <>
                  <Link
                    to={`/reports?assessmentId=${latest.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors text-xs font-bold text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-secondary" />
                      <span>Generate Board Risk Report</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </Link>

                  <Link
                    to={`/assessments/${latest.id}?tab=advisor`}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container transition-colors text-xs font-bold text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-secondary" />
                      <span>Consult Grounded AI Advisor</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </Link>
                </>
              ) : (
                <p className="text-xs font-bold text-on-surface-variant">
                  Complete an assessment to unlock reports and AI advisor.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant text-xs font-bold text-primary flex items-center justify-between">
            <span>ERIDSS Engine 2.0</span>
            <span className="text-secondary font-bold">
              Active & Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
