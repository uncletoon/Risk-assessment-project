import React, { useEffect, useState } from "react";
import { api, RuleGroup } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  Scale,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Filter,
  X,
  Layers,
  FolderPlus,
  Settings,
} from "lucide-react";

export default function RiskRules() {
  const { isRiskOfficer } = useAuth();
  const [rules, setRules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Rule Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [ruleGroupId, setRuleGroupId] = useState<number | undefined>(undefined);
  const [categoryCode, setCategoryCode] = useState("FINANCIAL");
  const [factorName, setFactorName] = useState("");
  const [conditionOperator, setConditionOperator] = useState("GT");
  const [thresholdValue, setThresholdValue] = useState("");
  const [likelihoodScore, setLikelihoodScore] = useState(4);
  const [impactScore, setImpactScore] = useState(4);
  const [severity, setSeverity] = useState("High");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Group Form Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RuleGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupActive, setGroupActive] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, catsData, groupsData] = await Promise.all([
        api.getAdminRules(),
        api.getAdminCategories(),
        api.getAdminRuleGroups(),
      ]);
      setRules(rulesData || []);
      setCategories(catsData || []);
      setRuleGroups(groupsData || []);

      if (catsData && catsData.length > 0 && !categoryCode) {
        setCategoryCode(catsData[0].code);
      }
      if (groupsData && groupsData.length > 0 && !ruleGroupId) {
        setRuleGroupId(groupsData[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load rules, categories, or rule groups:", err);
      setErrorMsg(err.message || "Failed to load rules engine data");
    } finally {
      setLoading(false);
    }
  };

  // --- Rule CRUD ---
  const openCreateModal = () => {
    setEditingRule(null);
    setCategoryCode(categories.length > 0 ? categories[0].code : "FINANCIAL");
    setRuleGroupId(
      selectedGroupFilter !== "ALL"
        ? Number(selectedGroupFilter)
        : ruleGroups.length > 0
          ? ruleGroups[0].id
          : undefined,
    );
    setFactorName("");
    setConditionOperator("GT");
    setThresholdValue("");
    setLikelihoodScore(4);
    setImpactScore(4);
    setSeverity("High");
    setDescription("");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setRuleGroupId(
      rule.rule_group_id ||
        (ruleGroups.length > 0 ? ruleGroups[0].id : undefined),
    );
    setCategoryCode(rule.category_code);
    setFactorName(rule.factor_name);
    setConditionOperator(rule.condition_operator);
    setThresholdValue(rule.threshold_value);
    setLikelihoodScore(Number(rule.likelihood_score) || 3);
    setImpactScore(Number(rule.impact_score) || 3);
    setSeverity(rule.severity || "Moderate");
    setDescription(rule.description || "");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);

      if (editingRule) {
        await api.updateAdminRule(editingRule.id, {
          category_code: categoryCode,
          factor_name: factorName.trim(),
          condition_operator: conditionOperator,
          threshold_value: thresholdValue.trim(),
          likelihood_score: Number(likelihoodScore),
          impact_score: Number(impactScore),
          severity,
          description: description.trim(),
          rule_group_id: ruleGroupId,
        });
        setSuccessMsg(`Rule '${factorName}' updated successfully.`);
      } else {
        await api.createAdminRule({
          categoryCode,
          factorName: factorName.trim(),
          conditionOperator,
          thresholdValue: thresholdValue.trim(),
          likelihoodScore: Number(likelihoodScore),
          impactScore: Number(impactScore),
          severity,
          description: description.trim(),
          ruleGroupId,
        });
        setSuccessMsg(`Rule '${factorName}' created successfully.`);
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: number, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete deterministic rule "${name}"?`,
      )
    )
      return;
    try {
      await api.deleteAdminRule(ruleId);
      setSuccessMsg(`Rule '${name}' deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete rule: ${err.message}`);
    }
  };

  const handleToggleActive = async (rule: any) => {
    try {
      await api.updateAdminRule(rule.id, { is_active: !rule.is_active });
      await loadData();
    } catch (err: any) {
      alert(`Error toggling rule: ${err.message}`);
    }
  };

  // --- Rule Group CRUD ---
  const openCreateGroupModal = () => {
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setGroupActive(true);
    setErrorMsg(null);
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = (group: RuleGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupActive(group.is_active);
    setErrorMsg(null);
    setIsGroupModalOpen(true);
  };

  const handleGroupModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGroup(true);
      setErrorMsg(null);

      if (editingGroup) {
        await api.updateAdminRuleGroup(editingGroup.id, {
          name: groupName.trim(),
          description: groupDescription.trim(),
          is_active: groupActive,
        });
        setSuccessMsg(`Rule group '${groupName}' updated.`);
      } else {
        const created = await api.createAdminRuleGroup({
          name: groupName.trim(),
          description: groupDescription.trim(),
          isActive: groupActive,
        });
        setSuccessMsg(`Rule group '${created.name}' created.`);
        setSelectedGroupFilter(String(created.id));
      }

      setIsGroupModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save rule group");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: RuleGroup) => {
    if (
      !window.confirm(
        `Are you sure you want to delete Rule Group "${group.name}"? All rules within this group will also be permanently deleted.`,
      )
    )
      return;
    try {
      await api.deleteAdminRuleGroup(group.id);
      setSuccessMsg(`Rule group '${group.name}' deleted successfully.`);
      setSelectedGroupFilter("ALL");
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete rule group: ${err.message}`);
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    const matchesCategory =
      selectedCategoryFilter === "ALL" ||
      r.category_code === selectedCategoryFilter;
    const matchesGroup =
      selectedGroupFilter === "ALL" ||
      String(r.rule_group_id) === selectedGroupFilter;
    return matchesCategory && matchesGroup;
  });

  const selectedGroupObj =
    selectedGroupFilter !== "ALL"
      ? ruleGroups.find((g) => String(g.id) === selectedGroupFilter)
      : null;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              {isRiskOfficer
                ? "Risk Officer Configuration"
                : "System Administration"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Deterministic Risk Rules Engine
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Organize risk rule engines into specialized groups (e.g. Retail
            Loans, SME Credit) and configure automated mathematical scoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={openCreateGroupModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-primary text-xs font-bold transition-all cursor-pointer"
            title="Create a new Rule Group"
          >
            <FolderPlus className="w-4 h-4 text-secondary" />
            <span>New Rule Group</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Rule</span>
          </button>
        </div>
      </div>

      {/* Rule Groups Tabs / Selector Bar */}
      <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-secondary" />
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Rule Engine Groups
            </span>
          </div>
          {selectedGroupObj && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditGroupModal(selectedGroupObj)}
                className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Group</span>
              </button>
              {ruleGroups.length > 1 && (
                <button
                  onClick={() => handleDeleteGroup(selectedGroupObj)}
                  className="text-xs font-bold text-error hover:underline flex items-center gap-1 cursor-pointer ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Group</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGroupFilter("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedGroupFilter === "ALL"
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-outline-variant"
            }`}
          >
            All Rule Groups ({rules.length} rules)
          </button>
          {ruleGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupFilter(String(g.id))}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                selectedGroupFilter === String(g.id)
                  ? "bg-secondary text-on-secondary shadow-xs"
                  : "bg-surface-container-low hover:bg-surface-container text-primary border border-outline-variant"
              }`}
            >
              <span>{g.name}</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                  selectedGroupFilter === String(g.id)
                    ? "bg-black/20 text-white"
                    : "bg-surface-container text-secondary"
                }`}
              >
                {g.rules_count ?? 0}
              </span>
            </button>
          ))}
        </div>

        {selectedGroupObj?.description && (
          <p className="text-xs text-on-surface-variant pt-1 border-t border-outline-variant/50">
            <strong>Group Context:</strong> {selectedGroupObj.description}
          </p>
        )}
      </div>

      {/* Category Filter Toolbar */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-secondary" />
          <span className="text-xs font-bold text-primary">
            Category Filter:
          </span>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs font-bold text-on-surface-variant">
          Showing {filteredRules.length} of {rules.length} Configured Rules
        </span>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-tertiary-container/20 text-on-tertiary-container text-xs font-bold flex items-center gap-2 border border-tertiary-fixed-dim/40">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isModalOpen && !isGroupModalOpen && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-center gap-2 border border-error/40">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-primary">
            Loading rules engine...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-on-surface-variant">
            No rules found for the selected group or category filter. Click "Add
            New Rule" above to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-primary font-black">
                  <th className="py-3.5 px-5 font-bold">Rule Group</th>
                  <th className="py-3.5 px-4 font-bold">Category</th>
                  <th className="py-3.5 px-4 font-bold">Risk Factor Name</th>
                  <th className="py-3.5 px-3 font-bold">Condition</th>
                  <th className="py-3.5 px-3 font-bold">Threshold</th>
                  <th className="py-3.5 px-3 font-bold text-center">
                    Likelihood
                  </th>
                  <th className="py-3.5 px-3 font-bold text-center">Impact</th>
                  <th className="py-3.5 px-3 font-bold">Severity</th>
                  <th className="py-3.5 px-3 font-bold">Status</th>
                  <th className="py-3.5 px-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {filteredRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="py-4 px-5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant">
                        {rule.rule_group_name || "Standard Group"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-secondary font-mono">
                      {rule.category_code}
                    </td>
                    <td
                      className="py-4 px-4 font-bold text-primary max-w-[200px] truncate"
                      title={rule.factor_name}
                    >
                      {rule.factor_name}
                      <p className="text-[11px] text-on-surface-variant font-medium truncate mt-0.5">
                        {rule.description || "Deterministic rule"}
                      </p>
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-primary">
                      {rule.condition_operator}
                    </td>
                    <td className="py-4 px-3 font-bold text-primary">
                      {rule.threshold_value}
                    </td>
                    <td className="py-4 px-3 text-center font-bold text-primary">
                      {rule.likelihood_score} / 5
                    </td>
                    <td className="py-4 px-3 text-center font-bold text-primary">
                      {rule.impact_score} / 5
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-primary border border-outline-variant">
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border cursor-pointer ${
                          rule.is_active
                            ? "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-fixed-dim/40"
                            : "bg-surface-container text-on-surface border-outline-variant"
                        }`}
                      >
                        {rule.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1.5 rounded-lg text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-secondary" />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteRule(rule.id, rule.factor_name)
                          }
                          className="p-1.5 rounded-lg text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-primary">
                {editingRule
                  ? `Edit Rule (${editingRule.factor_name})`
                  : "Add Deterministic Business Rule"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMsg(null);
                }}
                className="text-primary hover:text-error text-lg cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-start gap-2 border border-error/40">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Assigned Rule Group / Engine{" "}
                  <span className="text-secondary">*</span>
                </label>
                <select
                  value={ruleGroupId || ""}
                  onChange={(e) => setRuleGroupId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ruleGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Risk Category
                  </label>
                  <select
                    value={categoryCode}
                    onChange={(e) => setCategoryCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {categories.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Severity Tag
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Risk Factor Name / Keyword{" "}
                  <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={factorName}
                  onChange={(e) => setFactorName(e.target.value)}
                  placeholder="e.g. Supplier Concentration, Debt-to-Equity Ratio, Overdue Payments"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Condition Operator
                  </label>
                  <select
                    value={conditionOperator}
                    onChange={(e) => setConditionOperator(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="GT">GT (&gt; Greater Than)</option>
                    <option value="GTE">GTE (&gt;= Greater or Equal)</option>
                    <option value="LT">LT (&lt; Less Than)</option>
                    <option value="LTE">LTE (&lt;= Less or Equal)</option>
                    <option value="EQ">EQ (== Equals)</option>
                    <option value="CONTAINS">CONTAINS (Text Match)</option>
                    <option value="RANGE">RANGE (min..max)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Threshold Value <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    placeholder="e.g. 70%, 2.5, 500000, non-compliant"
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Likelihood Score (1 - 5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={likelihoodScore}
                    onChange={(e) => setLikelihoodScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Impact Score (1 - 5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={impactScore}
                    onChange={(e) => setImpactScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Rule Rationale & Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this threshold elevates risk likelihood or impact..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {saving
                    ? "Saving..."
                    : editingRule
                      ? "Save Changes"
                      : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Rule Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-base font-bold text-primary">
                {editingGroup
                  ? `Edit Rule Group (${editingGroup.name})`
                  : "Create New Rule Engine Group"}
              </h3>
              <button
                onClick={() => {
                  setIsGroupModalOpen(false);
                  setErrorMsg(null);
                }}
                className="text-primary hover:text-error text-lg cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-start gap-2 border border-error/40">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleGroupModalSubmit}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Group Name <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Retail Personal Loans, SME Credit Engine"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Description / Purpose
                </label>
                <textarea
                  rows={3}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Explain when risk officers should choose this rule engine..."
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="groupActive"
                  checked={groupActive}
                  onChange={(e) => setGroupActive(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label
                  htmlFor="groupActive"
                  className="text-xs font-bold text-primary cursor-pointer"
                >
                  Rule Group is Active for Assessments
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container font-bold text-primary cursor-pointer hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroup || !groupName.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingGroup
                    ? "Saving..."
                    : editingGroup
                      ? "Save Changes"
                      : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
