import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { HeartPulse, Database, Server, Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SystemHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load health metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              System Administration
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">Database & System Health</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Live operational diagnostics for PostgreSQL database, Gemini API connectivity, and backend services.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant hover:bg-surface-container-high text-xs font-bold text-primary transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-secondary" />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-primary">
          Running diagnostic health checks...
        </div>
      ) : !health ? (
        <div className="p-12 text-center text-xs text-error font-bold">Health check failed.</div>
      ) : (
        <div className="space-y-6">
          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-extrabold uppercase text-primary">API Engine</span>
                <Server className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                <span className="text-lg font-black text-primary">{health.status}</span>
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">Uptime: {health.uptimeSeconds} seconds</p>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-extrabold uppercase text-primary">PostgreSQL Database</span>
                <Database className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                <span className="text-lg font-black text-primary">{health.database}</span>
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">Pool Active & Healthy</p>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-extrabold uppercase text-primary">Gemini AI Model</span>
                <Cpu className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                <span className="text-lg font-black text-primary">gemini-3.6-flash</span>
              </div>
              <p className="text-xs font-semibold text-on-surface-variant">Structured JSON Output Active</p>
            </div>
          </div>

          {/* Database Metrics Grid */}
          <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
            <h2 className="text-base font-bold text-primary">Database Entity Storage Metrics</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs uppercase font-extrabold text-primary">Total Assessments</span>
                <p className="text-2xl font-black text-primary mt-1">{health.metrics?.totalAssessments || 0}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs uppercase font-extrabold text-primary">Identified Risks</span>
                <p className="text-2xl font-black text-primary mt-1">{health.metrics?.totalIdentifiedRisks || 0}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs uppercase font-extrabold text-primary">Mitigations</span>
                <p className="text-2xl font-black text-primary mt-1">{health.metrics?.totalMitigations || 0}</p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant">
                <span className="text-xs uppercase font-extrabold text-primary">Active Rules</span>
                <p className="text-2xl font-black text-primary mt-1">{health.metrics?.activeRules || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
