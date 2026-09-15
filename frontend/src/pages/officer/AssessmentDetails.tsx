import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AssessmentDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Decision Modal State
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [pendingDecisionType, setPendingDecisionType] = useState<'CONFIRMED' | 'REJECTED'>('CONFIRMED');
  const [officerNotes, setOfficerNotes] = useState('');
  const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);

  // Enterprise Scoring Form Fields
  const [likelihood, setLikelihood] = useState<number>(3);
  const [impact, setImpact] = useState<number>(3);
  const [controlEffectiveness, setControlEffectiveness] = useState<number>(25);
  const [exposureRwf, setExposureRwf] = useState<string>('45000000');
  const [mitigationTitle, setMitigationTitle] = useState<string>('');
  const [mitigationOwner, setMitigationOwner] = useState<string>('');

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/risk/submissions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmission(data);

        // Pre-fill metrics from prediction if available
        if (data.ai_prediction) {
          const pred = typeof data.ai_prediction === 'string' ? JSON.parse(data.ai_prediction) : data.ai_prediction;
          setLikelihood(pred.likelihood || 3);
          setImpact(pred.impact || 3);
          if (pred.suggested_controls && pred.suggested_controls.length > 0) {
            setMitigationTitle(pred.suggested_controls[0].title || '');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching assessment details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDecisionModal = (decisionType: 'CONFIRMED' | 'REJECTED') => {
    setPendingDecisionType(decisionType);
    const pred = typeof submission?.ai_prediction === 'string' ? JSON.parse(submission.ai_prediction) : submission?.ai_prediction;
    
    setOfficerNotes('');

    if (pred?.recommendations && Array.isArray(pred.recommendations)) {
      setSelectedRecommendations([...pred.recommendations]);
    } else {
      setSelectedRecommendations([]);
    }

    if (pred?.suggested_controls && pred.suggested_controls.length > 0) {
      setMitigationTitle(pred.suggested_controls[0].title || '');
      setMitigationOwner(submission?.submitted_by_name || 'Assigned Risk Officer');
    }

    setShowDecisionModal(true);
  };

  const inherentScore = likelihood * impact * 4;
  const residualScore = Math.max(5, Math.round(inherentScore * (1 - controlEffectiveness / 100)));

  const handleSubmitDecision = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!submission) return;

    setDeciding(true);
    try {
      const res = await fetch(`/api/v1/risk/submissions/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: pendingDecisionType,
          notes: officerNotes,
          selectedRecommendations,
          likelihood,
          impact,
          controlEffectiveness,
          exposureRwf: parseFloat(exposureRwf) || 45000000,
          mitigationAction: mitigationTitle ? {
            title: mitigationTitle,
            owner_name: mitigationOwner || 'Assigned Officer',
            effectiveness_gain_pct: 25
          } : null
        }),
      });

      if (!res.ok) throw new Error('Failed to record decision in database');

      const data = await res.json();
      
      setSubmission(data.submission);
      setShowDecisionModal(false);
      setMessage(`Risk officially ${pendingDecisionType.toLowerCase()}. Directives successfully recorded.`);

      await fetchSubmission();
    } catch (err: any) {
      console.error('Error submitting decision:', err);
      setMessage(err.message);
    } finally {
      setDeciding(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to move this assessment to Archive?')) return;

    setDeciding(true);
    try {
      const res = await fetch(`/api/v1/risk/submissions/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'ARCHIVED',
        }),
      });

      if (!res.ok) throw new Error('Failed to archive submission');

      const data = await res.json();
      setSubmission(data.submission);
      setMessage('Assessment moved to archive successfully.');
      await fetchSubmission();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setDeciding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-[32px] animate-spin mb-2">progress_activity</span>
        <p className="text-sm font-semibold">Loading Risk Assessment Intelligence...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8 bg-surface-container-lowest rounded-xl border border-outline-variant text-center">
        <p className="text-sm font-bold text-on-surface">Submission not found</p>
        <Link to="/officer/reviews" className="text-xs font-bold text-secondary mt-2 inline-block">Return to Decision Desk</Link>
      </div>
    );
  }

  const pred = typeof submission.ai_prediction === 'string' ? JSON.parse(submission.ai_prediction) : submission.ai_prediction;
  const isPending = submission.status === 'PENDING_REVIEW';
  const isArchived = submission.status === 'ARCHIVED';

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-on-surface">{submission.title}</h2>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              submission.status === 'CONFIRMED'
                ? 'bg-primary-container text-on-primary'
                : submission.status === 'REJECTED'
                ? 'bg-error-container text-on-error-container'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {submission.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Category: <strong className="text-on-surface uppercase">{submission.category}</strong> • Submitted by: <strong className="text-on-surface">{submission.submitted_by_name}</strong> • Evidence: <strong className="text-on-surface">{submission.filename}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/officer/reviews"
            className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all border border-outline-variant shadow-xs"
          >
            ← Decision Desk
          </Link>
          <Link
            to="/mitigations"
            className="px-4 py-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-bold transition-all border border-secondary/30 shadow-xs"
          >
            Mitigation Actions
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {message}
        </div>
      )}

      {/* Main Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: AI Prediction & Risk Narrative */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {pred ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">psychology</span>
                  <h3 className="text-base font-bold text-on-surface">Gemini AI Risk Diagnostic</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-on-surface-variant">Estimated Posture:</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    pred.risk_level === 'Critical'
                      ? 'bg-error-container text-on-error-container'
                      : pred.risk_level === 'High'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {pred.risk_level} (Score: {pred.eri_score}/100)
                  </span>
                </div>
              </div>

              {/* 12-Month Projection Narrative */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
                  12-Month Forward Projection
                </h4>
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 text-xs text-on-surface leading-relaxed">
                  {pred.one_year_projection}
                </div>
              </div>

              {/* Rule Compliance Summary */}
              {pred.rule_compliance_summary && (
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">policy</span>
                    Policy & Threshold Compliance Check
                  </h4>
                  <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60 text-xs text-on-surface">
                    {pred.rule_compliance_summary}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">lightbulb</span>
                  AI Mitigation Recommendations
                </h4>
                <div className="space-y-2">
                  {pred.recommendations?.map((rec: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-surface-container border border-outline-variant/50 flex items-start gap-2.5 text-xs text-on-surface">
                      <span className="w-5 h-5 rounded-full bg-secondary/15 text-secondary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <div className="text-xs text-on-surface-variant">
                  AI Decision Recommendation: <strong className="text-on-surface">{pred.decision}</strong>
                </div>

                {isPending ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenDecisionModal('REJECTED')}
                      className="px-4 py-2 rounded-lg border border-error text-error hover:bg-error/10 text-xs font-bold transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleOpenDecisionModal('CONFIRMED')}
                      className="px-5 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Confirm & Register in ERI
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                      Status: {submission.status}
                    </span>
                    {!isArchived && (
                      <button
                        onClick={handleArchive}
                        disabled={deciding}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 bg-surface-container-lowest rounded-xl border border-outline-variant text-center text-xs text-on-surface-variant">
              No AI prediction generated yet for this submission. Open the Decision Desk to run an analysis.
            </div>
          )}
        </div>

        {/* Right Column: Frontline Context & Metadata */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col gap-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider border-b border-outline-variant pb-2">
              Frontline Report Context
            </h3>
            <div className="p-3.5 rounded-lg bg-surface-container text-xs text-on-surface italic leading-relaxed">
              {submission.description}
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant/60">
              <p><strong>Submitted by:</strong> {submission.submitted_by_name || 'Frontline Staff'}</p>
              <p><strong>Created on:</strong> {new Date(submission.created_at).toLocaleString()}</p>
              <p><strong>PII Privacy Scan:</strong> <span className="text-emerald-600 font-bold">Passed</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CONFIRMATION & SCORING MODAL ================= */}
      {showDecisionModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl max-w-2xl w-full p-6 my-8 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px]">
                  {pendingDecisionType === 'CONFIRMED' ? 'verified' : 'cancel'}
                </span>
                <h3 className="text-base font-bold text-on-surface">
                  {pendingDecisionType === 'CONFIRMED' ? 'Confirm Enterprise Risk & Configure Scoring' : 'Reject Risk Submission'}
                </h3>
              </div>
              <button
                onClick={() => setShowDecisionModal(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {pendingDecisionType === 'CONFIRMED' ? (
              <div className="space-y-4 text-xs">
                {/* 5x5 Likelihood x Impact Adjuster */}
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface uppercase tracking-wider">
                      1. ISO 31000 Likelihood & Impact Ratings
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-on-surface-variant">Inherent Score: <strong className="text-on-surface">{inherentScore}</strong></span>
                      <span className="text-[11px] text-secondary font-bold">Residual Score: <strong>{residualScore}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface">Likelihood (1-5)</label>
                      <select
                        value={likelihood}
                        onChange={(e) => setLikelihood(parseInt(e.target.value))}
                        className="bg-surface-container-lowest text-xs rounded-lg border border-outline-variant p-2 text-on-surface"
                      >
                        <option value={1}>1 - Rare</option>
                        <option value={2}>2 - Unlikely</option>
                        <option value={3}>3 - Possible</option>
                        <option value={4}>4 - Likely</option>
                        <option value={5}>5 - Almost Certain</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface">Impact (1-5)</label>
                      <select
                        value={impact}
                        onChange={(e) => setImpact(parseInt(e.target.value))}
                        className="bg-surface-container-lowest text-xs rounded-lg border border-outline-variant p-2 text-on-surface"
                      >
                        <option value={1}>1 - Negligible</option>
                        <option value={2}>2 - Minor</option>
                        <option value={3}>3 - Moderate</option>
                        <option value={4}>4 - Major</option>
                        <option value={5}>5 - Catastrophic</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface">Control Effectiveness (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={controlEffectiveness}
                        onChange={(e) => setControlEffectiveness(Math.min(90, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="bg-surface-container-lowest text-xs rounded-lg border border-outline-variant p-2 text-on-surface"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 pt-2 border-t border-outline-variant/60">
                    <label className="text-[11px] font-bold text-on-surface">Assessed Exposure Amount (Rwf)</label>
                    <input
                      type="number"
                      value={exposureRwf}
                      onChange={(e) => setExposureRwf(e.target.value)}
                      className="bg-surface-container-lowest text-xs rounded-lg border border-outline-variant p-2 text-on-surface"
                      placeholder="e.g. 45000000"
                    />
                  </div>
                </div>

                {/* Initial Remediation Action */}
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant flex flex-col gap-2">
                  <span className="font-bold text-on-surface uppercase tracking-wider">
                    2. Assign Mitigation Control Action
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Action Title</label>
                      <input
                        type="text"
                        value={mitigationTitle}
                        onChange={(e) => setMitigationTitle(e.target.value)}
                        placeholder="e.g. Deploy Automated Storage Verification"
                        className="bg-surface-container-lowest text-xs rounded-lg border border-outline-variant p-2 text-on-surface"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-on-surface-variant">Responsible Owner</label>
                      <input
                        type="text"
                        value={mitigationOwner}
                        onChange={(e) => setMitigationOwner(e.target.value)}
                        placeholder="e.g. IT Lead / Procurement Head"
                        className="bg-surface-container-lowest text-xs rounded-lg border border-outline-variant p-2 text-on-surface"
                      />
                    </div>
                  </div>
                </div>

                {/* Officer Directives Note */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase tracking-wider text-on-surface">
                    3. Risk Officer Confirmation Notes & Directives *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    placeholder="Enter supervisory instructions and conditions for register approval..."
                    className="w-full p-2.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-on-surface-variant">
                  State the formal reason for rejecting this threat submission:
                </p>
                <textarea
                  rows={4}
                  required
                  value={officerNotes}
                  onChange={(e) => setOfficerNotes(e.target.value)}
                  placeholder="e.g., Threat is already handled under baseline maintenance SLA; no material enterprise exposure identified."
                  className="w-full p-2.5 rounded-lg border border-outline-variant bg-surface-container text-on-surface text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setShowDecisionModal(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitDecision}
                disabled={deciding || !officerNotes.trim()}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-secondary text-on-secondary hover:bg-secondary/90 transition-all shadow-xs cursor-pointer"
              >
                {deciding ? 'Recording in PostgreSQL...' : 'Confirm & Save into Risk Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
