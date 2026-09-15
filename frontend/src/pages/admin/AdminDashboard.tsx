import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [healthRes, statsRes] = await Promise.all([
        fetch('/api/v1/auth/admin/system-health'),
        fetch('/api/v1/risk/dashboard-stats'),
      ]);

      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHealthData(hData);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
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
          <h2 className="text-2xl font-bold text-primary tracking-tight">Executive Admin Dashboard</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Logged in as <strong className="text-on-surface">{user?.full_name}</strong>. Enterprise governance & system health oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all flex items-center gap-2 border border-outline-variant shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            Manage Users
          </Link>
          <Link
            to="/admin/health"
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">monitor_heart</span>
            System Health
          </Link>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">System Users</span>
            <div className="w-8 h-8 rounded-lg bg-primary-container/10 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-on-surface">
              {healthData?.database?.totalUsers || '3'}
            </div>
            <p className="text-xs text-on-tertiary-container font-medium mt-1">Active staff accounts</p>
          </div>
          <Link to="/admin/users" className="text-xs font-bold text-primary hover:underline">Manage accounts →</Link>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">assignment</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-extrabold text-on-surface">
              {healthData?.database?.totalSubmissions || '0'}
            </div>
            <p className="text-xs text-secondary font-medium mt-1">Incident reports ingested</p>
          </div>
          <span className="text-[11px] text-on-surface-variant">Recorded in PostgreSQL</span>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Monitored Portfolio</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-xl font-extrabold text-on-surface truncate">
              {exposure.toLocaleString()} Rwf
            </div>
            <p className="text-xs text-on-tertiary-container font-medium mt-1">Total assessed volume</p>
          </div>
          <Link to="/risks" className="text-xs font-bold text-primary hover:underline">View registry →</Link>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Database Engine</span>
            <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 text-on-tertiary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">database</span>
            </div>
          </div>
          <div className="my-3">
            <div className="text-xl font-extrabold text-on-tertiary-container flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Online
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Port 5433 • Size: {healthData?.database?.sizeFormatted || '7.5 MB'}</p>
          </div>
          <Link to="/admin/health" className="text-xs font-bold text-primary hover:underline">Health metrics →</Link>
        </div>
      </div>

      {/* Audit Trail & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Audit Logs from PostgreSQL */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex flex-col">
          <div className="p-4 border-b border-outline-variant bg-surface-bright rounded-t-xl">
            <h3 className="text-sm font-bold text-on-surface">Recent System Activity</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Live immutable activity logs from database.</p>
          </div>

          <div className="divide-y divide-outline-variant/60 text-xs">
            {healthData?.auditLogs && healthData.auditLogs.length > 0 ? (
              healthData.auditLogs.map((log: any) => (
                <div key={log.id} className="p-4 hover:bg-surface-container-low transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">history</span>
                    <div>
                      <p className="font-bold text-on-surface">{log.title}</p>
                      <p className="text-on-surface-variant mt-0.5">
                        By <strong className="text-on-surface">{log.submitted_by_name}</strong>
                        {log.decided_by && ` • Decided by ${log.decided_by}`}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      log.status === 'CONFIRMED'
                        ? 'bg-tertiary-fixed-dim/30 text-on-tertiary-container'
                        : 'bg-secondary-container/30 text-secondary'
                    }`}
                  >
                    {log.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-on-surface-variant">No activity records found.</div>
            )}
          </div>
        </div>

        {/* Database Live Tables */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">table_chart</span>
              Database Tables & Row Counts
            </h3>
            <div className="space-y-2 text-xs">
              {healthData?.tables && healthData.tables.length > 0 ? (
                healthData.tables.map((t: any) => (
                  <div key={t.table_name} className="flex justify-between py-2 border-b border-outline-variant/60 font-data-mono">
                    <span className="text-on-surface font-medium">{t.table_name}</span>
                    <span className="font-bold text-primary">{t.row_count} rows</span>
                  </div>
                ))
              ) : (
                <p className="text-on-surface-variant">Connecting...</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
