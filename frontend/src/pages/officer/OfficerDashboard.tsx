import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/risk/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching officer stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const exposure = parseFloat(stats?.assessments?.total_exposure_rwf || '0');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-primary tracking-tight">Risk Officer Decision Desk</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
              {user?.department || 'Risk & Compliance'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Logged in as <strong className="text-on-surface">{user?.full_name}</strong>. Configure custom rules, evaluate incident reports, and process risk assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/officer/reviews"
            className="px-4 py-2.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            Open Decision Desk
          </Link>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Pending Reviews</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">pending_actions</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-on-surface">
              {stats?.submissions?.pending_reviews || '0'}
            </div>
            <p className="text-xs text-amber-600 font-medium mt-1">Awaiting AI & rule review</p>
          </div>
          <Link to="/officer/reviews" className="text-xs font-bold text-secondary hover:underline">Process reports →</Link>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Confirmed Assessments</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-on-surface">
              {stats?.assessments?.total_assessments || '0'}
            </div>
            <p className="text-xs text-on-tertiary-container font-medium mt-1">Active risk assessments</p>
          </div>
          <Link to="/risks" className="text-xs font-bold text-primary hover:underline">View registry →</Link>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Exposure</span>
            <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-xl font-extrabold text-on-surface truncate">
              {exposure.toLocaleString()} Rwf
            </div>
            <p className="text-xs text-on-surface-variant font-medium mt-1">Assessed volume in Rwf</p>
          </div>
          <Link to="/risks" className="text-xs font-bold text-primary hover:underline">View risk portfolio →</Link>
        </div>
      </div>

      {/* Recent Submissions Queue */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex flex-col">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright rounded-t-xl">
          <div>
            <h3 className="text-base font-bold text-on-surface">Recent Intake Queue</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Live incoming risk reports from frontline departments.</p>
          </div>
          <Link to="/officer/reviews" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
            <span>Open Decision Desk</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="divide-y divide-outline-variant/60">
          {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
            stats.recentSubmissions.map((sub: any) => (
              <div key={sub.id} className="p-4 hover:bg-surface-container-low transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary-container flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">{sub.title}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1 italic">{sub.description}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1.5">
                      Category: <strong className="text-on-surface uppercase">{sub.category}</strong> • By: <strong className="text-on-surface">{sub.submitted_by_name || 'Staff'}</strong> • File: <code className="bg-surface-container px-1 py-0.5 rounded text-[10px] font-data-mono">{sub.filename}</code>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      sub.status === 'CONFIRMED'
                        ? 'bg-tertiary-fixed-dim/30 text-on-tertiary-container'
                        : sub.status === 'REJECTED'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {sub.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant">
              No submissions found in database.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}