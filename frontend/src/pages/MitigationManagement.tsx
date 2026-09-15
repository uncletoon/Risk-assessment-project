import React, { useEffect, useState } from 'react';
import { api, MitigationAction, Assessment } from '../lib/api';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Save,
  User,
  Calendar,
  Building2,
  Lock,
} from 'lucide-react';

export default function MitigationManagement() {
  const [mitigations, setMitigations] = useState<MitigationAction[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDept, setNewDept] = useState('Risk & Operations');
  const [newDueDate, setNewDueDate] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    fetchMitigations();
  }, []);

  const fetchMitigations = async () => {
    try {
      setLoading(true);
      const [mitData, assessData] = await Promise.all([
        api.getMitigations(),
        api.getAssessments(),
      ]);
      setMitigations(mitData);
      setAssessments(assessData);
      if (assessData.length > 0 && !selectedAssessmentId) {
        setSelectedAssessmentId(assessData[0].id);
      }
    } catch (err) {
      console.error('Failed to load mitigations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    try {
      const progress = status === 'COMPLETED' ? 100 : status === 'PENDING' ? 0 : 50;
      await api.updateMitigation(id, { status, progress_pct: progress });
      fetchMitigations();
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleProgressChange = async (id: number, progressPct: number) => {
    try {
      const status = progressPct >= 100 ? 'COMPLETED' : progressPct === 0 ? 'PENDING' : 'IN_PROGRESS';
      await api.updateMitigation(id, { progress_pct: progressPct, status });
      fetchMitigations();
    } catch (err: any) {
      alert(`Error updating progress: ${err.message}`);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingNew(true);
      const assessmentId = selectedAssessmentId || (assessments.length > 0 ? assessments[0].id : 1);

      await api.createMitigation({
        assessment_id: assessmentId,
        title: newTitle,
        action_description: newDesc,
        priority: newPriority,
        assigned_to: newAssignee || 'Risk Officer',
        department: newDept,
        due_date: newDueDate || undefined,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchMitigations();
    } catch (err: any) {
      alert(`Failed to create mitigation: ${err.message}`);
    } finally {
      setSavingNew(false);
    }
  };

  const filteredMitigations = mitigations.filter((m) => {
    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchPriority = priorityFilter === 'ALL' || m.priority === priorityFilter;
    return matchStatus && matchPriority;
  });

  const total = mitigations.length;
  const completed = mitigations.filter((m) => m.status === 'COMPLETED' || m.progress_pct === 100).length;
  const inProgress = mitigations.filter((m) => m.status === 'IN_PROGRESS' && m.progress_pct < 100).length;
  const pending = mitigations.filter((m) => m.status === 'PENDING' && m.progress_pct < 100).length;
  const avgProgress = total > 0 ? Math.round(mitigations.reduce((acc, m) => acc + (m.progress_pct || 0), 0) / total) : 0;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-error-container text-on-error-container border-error/40 font-bold';
      case 'HIGH':
        return 'bg-secondary-container/20 text-secondary border-secondary-container/40 font-bold';
      case 'MEDIUM':
        return 'bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40 font-bold';
      default:
        return 'bg-surface-container text-primary border-outline-variant font-bold';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              Decision Support & Governance
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Risk Mitigation Management
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Convert AI intelligence into measurable remediation tasks, assign departments, and track execution.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Mitigation Task</span>
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
          <p className="text-xs uppercase font-extrabold text-primary">Overall Execution</p>
          <p className="text-2xl font-black text-primary my-1">{avgProgress}%</p>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div className="h-full bg-tertiary-fixed-dim rounded-full" style={{ width: `${avgProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
          <p className="text-xs uppercase font-extrabold text-primary">In Progress</p>
          <p className="text-2xl font-black text-secondary my-1">{inProgress}</p>
          <p className="text-xs font-semibold text-on-surface-variant">Active execution underway</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
          <p className="text-xs uppercase font-extrabold text-primary">Completed (Finalized)</p>
          <p className="text-2xl font-black text-on-tertiary-container my-1">{completed}</p>
          <p className="text-xs font-semibold text-on-surface-variant">Risk exposure verified mitigated</p>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
          <p className="text-xs uppercase font-extrabold text-primary">Pending</p>
          <p className="text-2xl font-black text-primary my-1">{pending}</p>
          <p className="text-xs font-semibold text-on-surface-variant">Awaiting assignment / kickoff</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
            <Filter className="w-4 h-4 text-secondary" />
            <span>Filter By:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="text-xs text-primary font-bold">
          Showing {filteredMitigations.length} of {total} Actions
        </div>
      </div>

      {/* Mitigation Action Items Table / List */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-primary">
            Loading mitigation actions...
          </div>
        ) : filteredMitigations.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-on-surface-variant">
            No mitigation actions match the selected filters.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {filteredMitigations.map((item) => {
              const isCompleted = item.progress_pct === 100 || item.status === 'COMPLETED';

              return (
                <div key={item.id} className="p-5 hover:bg-surface-container-low transition-colors space-y-3">
                  {/* Top Bar: Priority, Title, Category, Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getPriorityBadge(item.priority)}`}>
                        {item.priority}
                      </span>
                      <h3 className="text-sm font-bold text-primary">{item.title}</h3>
                      {item.category_code && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant">
                          {item.category_code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="px-2.5 py-1 rounded-lg bg-tertiary-container/20 text-on-tertiary-container text-xs font-black border border-tertiary-fixed-dim/40 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary-fixed-dim" />
                          <span>COMPLETED (100% - Locked)</span>
                        </span>
                      ) : (
                        <select
                          value={item.status}
                          onChange={(e: any) => handleStatusChange(item.id, e.target.value)}
                          className="px-2.5 py-1 bg-surface-container border border-outline-variant rounded-lg text-xs font-bold text-primary cursor-pointer"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Associated Assessment Reference */}
                  <div className="flex items-center gap-1.5 text-xs text-on-surface font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span>Assessment: <strong className="text-primary">{item.assessment_title || `Assessment #${item.assessment_id}`}</strong></span>
                    {item.org_name && <span className="text-on-surface-variant font-medium">({item.org_name})</span>}
                  </div>

                  {/* Action Description */}
                  <p className="text-xs text-on-surface leading-relaxed font-medium">{item.action_description}</p>

                  {/* Target Risk if linked */}
                  {item.risk_name && (
                    <div className="text-xs text-on-surface-variant flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-secondary shrink-0" />
                      <span>Target Risk: <strong className="text-primary font-bold">{item.risk_name}</strong></span>
                    </div>
                  )}

                  {/* Progress Bar & Meta Details */}
                  <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold text-primary">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-secondary" />
                        <span>{item.assigned_to || 'Unassigned'} ({item.department || 'Operations'})</span>
                      </div>

                      {item.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-secondary" />
                          <span>Due: {new Date(item.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Slider (Locked at 100%) */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className={`text-xs font-black ${isCompleted ? 'text-on-tertiary-container' : 'text-primary'}`}>
                        {item.progress_pct}%
                      </span>
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5" title="Completed mitigation task is finalized (100%) and cannot be modified.">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            disabled
                            value={100}
                            className="w-28 sm:w-36 accent-tertiary-fixed-dim cursor-not-allowed opacity-60"
                          />
                          <Lock className="w-3.5 h-3.5 text-tertiary-fixed-dim shrink-0" />
                        </div>
                      ) : (
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={item.progress_pct || 0}
                          onChange={(e) => handleProgressChange(item.id, Number(e.target.value))}
                          title="Slide to update progress from 0% to 100%"
                          className="w-28 sm:w-36 accent-secondary cursor-pointer"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Mitigation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-primary">Add Custom Mitigation Action</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-primary hover:text-error text-lg cursor-pointer font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-4 text-xs">
              {/* Associated Assessment Dropdown */}
              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Associated Assessment
                </label>
                <select
                  value={selectedAssessmentId || ''}
                  onChange={(e) => setSelectedAssessmentId(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {assessments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} (#{a.id}) - ERI: {Number(a.overall_eri || 0).toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Action Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Implement Multi-Factor Authentication on Bastion Hosts"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Description & Plan
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detail operational and technical steps to resolve this exposure..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
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
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
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
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    placeholder="e.g. Chief Information Security Officer"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="e.g. Information Technology"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container font-bold text-primary cursor-pointer hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingNew ? 'Creating...' : 'Create Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
