import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Assessment {
  id: number;
  borrower_id: string;
  borrower_name: string;
  loan_amount: string | number;
  loan_purpose: string;
  risk_score: number;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  default_probability: number;
  recommendation: string;
  ai_explanation: string;
  assessment_date: string;
}

export default function RisksList() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBand, setSelectedBand] = useState('ALL');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/risk/assessments');
      if (res.ok) {
        const data = await res.json();
        setAssessments(data);
      }
    } catch (e) {
      console.error('Error loading assessments from DB:', e);
    } finally {
      setLoading(false);
    }
  };

  const getBandBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-error text-on-error font-bold';
      case 'High':
        return 'bg-secondary text-on-secondary font-bold';
      case 'Moderate':
        return 'bg-secondary-container/40 text-secondary font-bold border border-secondary/30';
      case 'Low':
      default:
        return 'bg-tertiary-fixed-dim/30 text-on-tertiary-container font-bold border border-tertiary-container/30';
    }
  };

  const filtered = assessments.filter(a => {
    const matchesSearch = 
      (a.borrower_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.borrower_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.loan_purpose || '').toLowerCase().includes(search.toLowerCase());

    const matchesBand = selectedBand === 'ALL' || a.risk_level === selectedBand;
    return matchesSearch && matchesBand;
  });

  const totalExposure = filtered.reduce(
    (sum, a) => sum + (parseFloat(String(a.loan_amount)) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary tracking-tight">Active Risk Registry</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Confirmed credit & borrower risk evaluations from PostgreSQL • Monitored in Rwandan Francs (<strong>Rwf</strong>)
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs uppercase font-bold text-on-surface-variant">Filtered Exposure</span>
          <p className="text-xl font-extrabold text-primary">
            {totalExposure.toLocaleString()} <span className="text-xs font-normal text-on-surface-variant">Rwf</span>
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search borrower or purpose..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'Critical', 'High', 'Moderate', 'Low'].map((band) => (
            <button
              key={band}
              onClick={() => setSelectedBand(band)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedBand === band
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {band === 'ALL' ? 'All Risks' : band}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">Loading assessments from database...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                  <th className="px-5 py-3.5">Borrower / Profile</th>
                  <th className="px-5 py-3.5">Purpose</th>
                  <th className="px-5 py-3.5 text-center">ERI Score</th>
                  <th className="px-5 py-3.5 text-center">Risk Level</th>
                  <th className="px-5 py-3.5 text-right">Exposure (Rwf)</th>
                  <th className="px-5 py-3.5">Recommendation & Mitigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 text-xs">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-on-surface">{a.borrower_name}</p>
                      <p className="text-[11px] text-on-surface-variant font-data-mono">{a.borrower_id}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-on-surface">{a.loan_purpose}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-bold text-sm text-on-surface">{a.risk_score}</span>
                      <span className="text-[10px] text-on-surface-variant">/100</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] ${getBandBadge(a.risk_level)}`}>
                        {a.risk_level}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-data-mono font-bold text-primary">
                      {parseFloat(String(a.loan_amount)).toLocaleString()} Rwf
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="font-semibold text-on-surface truncate">{a.recommendation}</p>
                      <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{a.ai_explanation}</p>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-on-surface-variant">
                      No matching risk records found in PostgreSQL.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
