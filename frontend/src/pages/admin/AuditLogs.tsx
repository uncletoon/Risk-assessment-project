import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Activity,
  Download,
  Printer,
  Search,
  Filter,
  Calendar,
  Layers,
  User,
  ShieldCheck,
  RefreshCw,
  Eye,
  X,
  FileSpreadsheet,
} from 'lucide-react';

const ACTION_TYPES = [
  { label: 'All Actions', value: 'ALL' },
  { label: 'User Created', value: 'USER_CREATED' },
  { label: 'User Updated', value: 'USER_UPDATED' },
  { label: 'Category Weight Updated', value: 'CATEGORY_WEIGHT' },
  { label: 'Batch Weights Updated', value: 'CATEGORY_WEIGHTS_BATCH_UPDATED' },
  { label: 'Rule Created', value: 'RULE_CREATED' },
  { label: 'Rule Updated', value: 'RULE_UPDATED' },
  { label: 'Rule Deleted', value: 'RULE_DELETED' },
  { label: 'Assessment Created', value: 'ASSESSMENT_CREATED' },
  { label: 'Assessment Completed', value: 'ASSESSMENT_COMPLETED' },
  { label: 'Document Uploaded', value: 'DOCUMENT_UPLOADED' },
  { label: 'Mitigation Created', value: 'MITIGATION_ACTION_CREATED' },
  { label: 'Mitigation Updated', value: 'MITIGATION_ACTION_UPDATED' },
];

const ENTITY_TYPES = [
  { label: 'All Entities', value: 'ALL' },
  { label: 'Users', value: 'users' },
  { label: 'Risk Categories', value: 'risk_categories' },
  { label: 'Risk Rules', value: 'risk_rules' },
  { label: 'Assessments', value: 'assessments' },
  { label: 'Documents', value: 'documents' },
  { label: 'Mitigations', value: 'mitigation_actions' },
];

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(100);

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, startDate, endDate, limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { limit };
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (entityFilter !== 'ALL') params.entityType = entityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await api.getAdminAuditLogs(params);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params: any = {};
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (entityFilter !== 'ALL') params.entityType = entityFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search) params.actor = search;

      await api.exportAdminAuditLogsCsv(params);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setStartDate('');
    setEndDate('');
    setLimit(100);
  };

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.ip_address || '').includes(search)
  );

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Global Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Compliance & Security
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">Enterprise Audit Trail</h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Immutable records of governance updates, deterministic scoring triggers, user activity, and compliance events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-all cursor-pointer border border-outline-variant shadow-xs disabled:opacity-50"
            title="Download full filtered logs as standard CSV"
          >
            <Download className="w-4 h-4 text-secondary" />
            <span>{exporting ? 'Exporting CSV...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold transition-all cursor-pointer shadow-sm"
            title="Print official audit compliance report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Audit Report</span>
          </button>
        </div>
      </div>

      {/* Printable Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 p-4 border-b border-black text-black">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider">Enterprise Risk Intelligence (ERIDSS)</h1>
            <p className="text-sm font-semibold">Official Security & Governance Audit Report</p>
          </div>
          <div className="text-right text-xs">
            <p>Generated: {new Date().toUTCString()}</p>
            <p>Status: Certified Immutable</p>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-primary tracking-wider">
            <Filter className="w-3.5 h-3.5 text-secondary" />
            <span>Filter Audit Trail</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-[11px] font-bold text-secondary hover:underline cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
              Search Actor / Action / IP
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. admin@eridss.com, CATEGORY, 127.0.0.1"
                className="w-full pl-8 pr-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold text-primary placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
              Target Entity
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ENTITY_TYPES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          {/* Limit Selector */}
          <div>
            <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
              Record Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={50}>Latest 50</option>
              <option value={100}>Latest 100</option>
              <option value={250}>Latest 250</option>
              <option value={500}>Latest 500</option>
              <option value={1000}>Latest 1000</option>
            </select>
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div>
            <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
              Start Date (From)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
              End Date (To)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-primary flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-secondary" />
            <span>Loading audit log entries...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-on-surface-variant">
            No audit records matching the specified filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-primary font-black">
                  <th className="py-3.5 px-5 font-bold">Action</th>
                  <th className="py-3.5 px-4 font-bold">Actor</th>
                  <th className="py-3.5 px-4 font-bold">Target Entity</th>
                  <th className="py-3.5 px-4 font-bold">Timestamp (UTC)</th>
                  <th className="py-3.5 px-3 font-bold">IP Address</th>
                  <th className="py-3.5 px-4 font-bold">Details Preview</th>
                  <th className="py-3.5 px-4 font-bold text-right print:hidden">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-primary font-mono text-[11px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-primary">{log.user_name || 'System / Service'}</div>
                      <div className="text-[10px] text-on-surface-variant">{log.user_email || 'automated@system'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface font-mono font-semibold text-[11px]">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="py-3.5 px-4 text-on-surface font-medium whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-primary font-mono text-[11px] font-semibold">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td
                      className="py-3.5 px-4 text-on-surface-variant max-w-[200px] truncate text-[11px] font-mono"
                      title={JSON.stringify(log.details)}
                    >
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-3.5 px-4 text-right print:hidden">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
                        title="View Full Log Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-primary-container/20 text-primary border border-primary-container/40">
                  Audit Log #{selectedLog.id}
                </span>
                <h3 className="text-base font-bold text-primary mt-1 font-mono">{selectedLog.action}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-primary hover:text-error text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-outline-variant/40">
              <div className="pt-2 flex justify-between">
                <span className="font-bold text-on-surface-variant">Timestamp:</span>
                <span className="font-semibold text-primary">{new Date(selectedLog.created_at).toUTCString()}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="font-bold text-on-surface-variant">Actor:</span>
                <span className="font-semibold text-primary">{selectedLog.user_name} ({selectedLog.user_email || 'System'})</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="font-bold text-on-surface-variant">Entity:</span>
                <span className="font-mono font-semibold text-primary">{selectedLog.entity_type} #{selectedLog.entity_id || 'N/A'}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="font-bold text-on-surface-variant">IP Address:</span>
                <span className="font-mono font-semibold text-primary">{selectedLog.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">
                Payload / Event Details (JSON)
              </label>
              <pre className="p-3 bg-surface-container rounded-xl font-mono text-[11px] text-primary overflow-x-auto border border-outline-variant max-h-56">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-surface-container font-bold text-primary cursor-pointer hover:bg-surface-container-high text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
