import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import {
  FileText,
  Printer,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function Reports() {
  const [searchParams] = useSearchParams();
  const paramAssessmentId = searchParams.get('assessmentId');

  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(
    paramAssessmentId ? parseInt(paramAssessmentId, 10) : null
  );
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessmentsList();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadReport(selectedId);
    }
  }, [selectedId]);

  const fetchAssessmentsList = async () => {
    try {
      const list = await api.getAssessments();
      const completed = list.filter((a) => a.status === 'COMPLETED');
      setAssessments(completed);
      if (!selectedId && completed.length > 0) {
        setSelectedId(completed[0].id);
      }
    } catch (err) {
      console.error('Failed to load assessments for reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (assessId: number) => {
    try {
      setLoading(true);
      const rep = await api.getReport(assessId);
      setReport(rep);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Controls Bar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Audit-Ready Decision Support
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Formal Enterprise Risk Report
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Official immutable risk assessment report for the Board of Directors and Regulatory Compliance Committees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {assessments.length > 0 && (
            <select
              value={selectedId || ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} (ERI: {Number(a.overall_eri || 0).toFixed(1)})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            disabled={!report}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-primary">
          Compiling formal risk report...
        </div>
      ) : !report ? (
        <div className="p-12 text-center text-xs font-bold text-on-surface-variant">
          No completed assessments found to generate a report.
        </div>
      ) : (
        /* Printable Report Document */
        <div className="bg-surface-container-lowest p-6 sm:p-10 md:p-12 rounded-2xl border border-outline-variant shadow-lg space-y-8 print:p-0 print:border-none print:shadow-none text-on-surface">
          {/* Formal Report Header */}
          <div className="border-b-2 border-primary pb-6 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                  ERIDSS ENTERPRISE RISK INTELLIGENCE REPORT
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight mt-0.5">
                  {report.assessment.title}
                </h2>
                <p className="text-xs font-bold text-primary mt-1">
                  Organization: {report.organization.name} ({report.organization.industry})
                </p>
              </div>

              <div className="text-left sm:text-right text-xs space-y-1">
                <p className="font-mono text-xs font-black text-primary">{report.reportMetadata.reportId}</p>
                <p className="text-primary font-semibold text-[11px]">
                  Date: {new Date(report.reportMetadata.generatedAt).toLocaleDateString()}
                </p>
                <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded bg-error-container text-on-error-container border border-error/40 uppercase">
                  CONFIDENTIAL // BOARD COMMITTEE ONLY
                </span>
              </div>
            </div>

            {report.document && (
              <div className="pt-2 text-xs text-primary font-semibold flex flex-wrap items-center gap-4">
                <span><strong>Analyzed Document:</strong> {report.document.filename}</span>
                <span><strong>File Size:</strong> {(report.document.fileSizeBytes / 1024).toFixed(1)} KB</span>
                <span className="text-secondary font-bold">Single-Document Architecture</span>
              </div>
            )}
          </div>

          {/* Section 1: Executive Summary & Enterprise Risk Index */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary border-b border-outline-variant pb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span>1. Executive Briefing & Enterprise Risk Index (ERI)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col justify-center text-center">
                <span className="text-xs uppercase font-extrabold text-primary">
                  Calculated Enterprise Risk Index
                </span>
                <p className="text-4xl font-black text-primary my-1">
                  {Number(report.assessment.overallERI || 0).toFixed(1)} <span className="text-xs font-bold text-on-surface-variant">/ 100</span>
                </p>
                <span className="text-xs font-extrabold text-secondary">
                  Stance: {report.assessment.eriClassification}
                </span>
              </div>

              <div className="md:col-span-2 p-5 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
                <h4 className="text-xs font-bold text-primary">Executive Summary:</h4>
                <p className="text-xs text-on-surface leading-relaxed whitespace-pre-line font-medium">
                  {report.executiveSummary}
                </p>
              </div>
            </div>

            {report.riskPositionOverview && (
              <div className="p-4 rounded-xl bg-surface-container-low text-xs space-y-1">
                <strong className="text-primary font-bold">Organizational Resilience Profile:</strong>
                <p className="text-on-surface leading-relaxed font-medium">{report.riskPositionOverview}</p>
              </div>
            )}
          </div>

          {/* Section 2: Deterministic Category Risk Distribution */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary border-b border-outline-variant pb-1 flex items-center gap-2">
              <Scale className="w-4 h-4 text-secondary" />
              <span>2. 5-Category Deterministic Risk Distribution</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-outline-variant rounded-xl overflow-hidden min-w-[500px]">
                <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-primary font-black border-b border-outline-variant">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Category</th>
                    <th className="py-2.5 px-3 font-bold text-right">Category Score (0-100)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Assigned Weight</th>
                    <th className="py-2.5 px-4 font-bold text-right">Weighted Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {report.categoryBreakdown?.map((cat: any) => (
                    <tr key={cat.id}>
                      <td className="py-2.5 px-4 font-bold text-primary">{cat.category_name || cat.category_code}</td>
                      <td className="py-2.5 px-3 text-right font-black text-primary">{Number(cat.category_score).toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-on-surface">{Number(cat.category_weight)}%</td>
                      <td className="py-2.5 px-4 text-right font-black text-secondary">{Number(cat.weighted_score).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Traceable Identified Risks Register */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary border-b border-outline-variant pb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-secondary" />
              <span>3. Traceable Identified Risks & Document Evidence Register</span>
            </h3>

            <div className="space-y-3">
              {report.identifiedRisks?.map((risk: any) => (
                <div key={risk.id} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-secondary mr-2">
                        [{risk.category_name || risk.category_code}]
                      </span>
                      <strong className="text-sm font-bold text-primary">{risk.risk_name}</strong>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="font-black text-primary">Residual: {Number(risk.residual_risk).toFixed(1)}</span>
                      <span className="text-[11px] text-on-surface font-semibold block">
                        ({risk.likelihood} × {risk.impact} = {risk.inherent_risk} | Control: -{risk.control_score}%)
                      </span>
                    </div>
                  </div>

                  <p className="text-on-surface leading-relaxed font-medium">{risk.risk_description}</p>

                  {risk.evidence_list && risk.evidence_list.length > 0 && (
                    <div className="p-3 rounded-lg bg-surface-container border border-outline-variant text-xs space-y-1">
                      <p className="font-bold text-primary">Supporting Document Evidence Quote:</p>
                      <blockquote className="italic text-on-surface border-l-2 border-secondary pl-2 font-medium">
                        "{risk.evidence_list[0].evidence_text}"
                      </blockquote>
                      <p className="text-[11px] font-semibold text-on-surface-variant">
                        Source Reference: {risk.evidence_list[0].source_location || 'Document'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Mitigation Action Plan */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary border-b border-outline-variant pb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-secondary" />
              <span>4. Strategic Mitigation Action Roadmap</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {report.aiRecommendations?.map((rec: any) => (
                <div key={rec.id} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-surface-container text-secondary border border-outline-variant">
                      {rec.priority.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-primary font-bold">{rec.suggested_timeframe}</span>
                  </div>
                  <h5 className="font-bold text-primary text-sm">{rec.title}</h5>
                  <p className="text-on-surface leading-relaxed font-medium">{rec.recommendation_text}</p>
                  {rec.expected_outcome && (
                    <p className="text-xs text-primary font-semibold pt-1">
                      <strong>Target Outcome:</strong> {rec.expected_outcome}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Formal Signature Footer */}
          <div className="pt-8 border-t border-outline-variant grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-on-surface">
            <div className="space-y-1">
              <p className="font-bold text-primary">Chief Risk Officer (Risk Assurance):</p>
              <div className="h-8 border-b border-outline-variant"></div>
              <p className="text-[11px] font-medium text-on-surface-variant">Verified Deterministic ERI Calculation & Evidence Traceability</p>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-primary">Executive Committee / Board Governance:</p>
              <div className="h-8 border-b border-outline-variant"></div>
              <p className="text-[11px] font-medium text-on-surface-variant">Approved Risk Mitigation Roadmap & Operational Mandates</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
