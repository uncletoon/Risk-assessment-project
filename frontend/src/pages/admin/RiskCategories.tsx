import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Shield,
  Layers,
  X,
} from "lucide-react";

export default function RiskCategories() {
  const { isSystemAdmin, isRiskOfficer } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formWeight, setFormWeight] = useState(15);
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getAdminCategories();
      setCategories(data);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      setErrorMsg(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (code: string, newWeight: number) => {
    setErrorMsg(null);
    setCategories((prev) =>
      prev.map((c) =>
        c.code === code ? { ...c, default_weight: newWeight } : c,
      ),
    );
  };

  const handleEqualDistribution = () => {
    setErrorMsg(null);
    const activeCats = categories.filter((c) => c.is_active !== false);
    if (activeCats.length === 0) return;

    const count = activeCats.length;
    const baseWeight = Math.floor((100 / count) * 100) / 100;
    const remainder = Number((100 - baseWeight * count).toFixed(2));

    let activeIndex = 0;
    setCategories((prev) =>
      prev.map((c) => {
        if (c.is_active === false) {
          return { ...c, default_weight: 0 };
        }
        const assigned =
          activeIndex === 0
            ? Number((baseWeight + remainder).toFixed(2))
            : baseWeight;
        activeIndex++;
        return { ...c, default_weight: assigned };
      }),
    );
  };

  const activeCategories = categories.filter((c) => c.is_active !== false);
  const totalWeight = activeCategories.reduce(
    (sum, c) => sum + (Number(c.default_weight) || 0),
    0,
  );
  const isBalanced = Math.abs(totalWeight - 100) < 0.05;

  const handleSaveWeights = async () => {
    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      if (!isBalanced) {
        throw new Error(
          `Total active category weights must sum to exactly 100.0% before saving (Current sum: ${totalWeight.toFixed(2)}%).`,
        );
      }

      const payload = categories.map((c) => ({
        code: c.code,
        defaultWeight: Number(c.default_weight),
      }));

      await api.updateAdminCategoryWeightsBatch(payload);
      setSuccessMsg("Risk category weights updated and verified successfully.");
      setTimeout(() => setSuccessMsg(null), 5000);
      fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update category weights");
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormCode("");
    setFormName("");
    setFormWeight(15);
    setFormDesc("");
    setFormActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setFormCode(cat.code);
    setFormName(cat.name);
    setFormWeight(Number(cat.default_weight) || 0);
    setFormDesc(cat.description || "");
    setFormActive(cat.is_active !== false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSaving(true);

    try {
      if (editingCategory) {
        await api.updateAdminCategory(editingCategory.code, {
          name: formName.trim(),
          description: formDesc.trim(),
          defaultWeight: Number(formWeight),
          isActive: formActive,
        });
        setSuccessMsg(
          `Category '${editingCategory.code}' updated successfully.`,
        );
      } else {
        await api.createAdminCategory({
          code: formCode.trim().toUpperCase(),
          name: formName.trim(),
          description: formDesc.trim(),
          defaultWeight: Number(formWeight),
          isActive: formActive,
        });
        setSuccessMsg(
          `Category '${formCode.trim().toUpperCase()}' created successfully.`,
        );
      }

      setIsModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchCategories();
    } catch (err: any) {
      setModalError(err.message || "Failed to save category");
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteCategory = async (code: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${name}" (${code}) and its associated deterministic rules?`,
      )
    ) {
      return;
    }

    try {
      setErrorMsg(null);
      await api.deleteAdminCategory(code);
      setSuccessMsg(`Category '${code}' deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete category");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-4 h-4 text-secondary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              {isRiskOfficer
                ? "Risk Officer Configuration"
                : "System Administration"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Risk Categories & Mathematical Weighting Engine
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-0.5">
            Configure risk dimensions, weights, and descriptions that drive
            deterministic scoring and AI risk calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-all cursor-pointer border border-outline-variant shadow-xs"
          >
            <Plus className="w-4 h-4 text-secondary" />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            onClick={handleEqualDistribution}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-all cursor-pointer border border-outline-variant"
            title="Automatically distribute 100% equally across all active categories"
          >
            <Sparkles className="w-3.5 h-3.5 text-secondary" />
            <span>Equalize (100%)</span>
          </button>

          <button
            onClick={handleSaveWeights}
            disabled={saving || !isBalanced}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isBalanced
                ? "bg-primary text-on-primary hover:bg-primary/90"
                : "bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-60"
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {saving ? "Validating & Saving..." : "Save Category Weights"}
            </span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-tertiary-container/20 text-on-tertiary-container text-xs font-bold flex items-center gap-2 border border-tertiary-fixed-dim/40">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-center gap-2 border border-error/40">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Weight Balance Card */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <span className="text-xs font-black text-primary uppercase tracking-wider">
            Total Active Category Weight Allocation
          </span>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            Mathematical baseline requires the sum of all active category
            weights to equal exactly 100.0%.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-2xl font-black ${
              isBalanced ? "text-on-tertiary-container" : "text-error"
            }`}
          >
            {totalWeight.toFixed(2)}%
          </span>
          {isBalanced ? (
            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-tertiary-container/20 text-on-tertiary-container border border-tertiary-fixed-dim/40 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Balanced (100%)</span>
            </span>
          ) : (
            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-error-container text-on-error-container border border-error/40 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Unbalanced (Delta: {(100 - totalWeight).toFixed(2)}%)</span>
            </span>
          )}
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-primary">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-on-surface-variant">
            No risk categories found. Click &quot;Add Category&quot; above to
            create one.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {categories.map((cat) => (
              <div
                key={cat.id || cat.code}
                className={`p-5 sm:p-6 transition-colors space-y-3 ${
                  cat.is_active === false
                    ? "bg-surface-container-low/40 opacity-75"
                    : "hover:bg-surface-container-low"
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-surface-container text-secondary border border-outline-variant font-mono">
                        {cat.code}
                      </span>
                      <h3 className="text-sm font-bold text-primary">
                        {cat.name}
                      </h3>
                      {cat.is_active === false && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-error-container text-on-error-container">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface font-medium leading-relaxed">
                      {cat.description || "No description configured."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-primary">
                        Weight (%):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={cat.is_active === false}
                        value={cat.default_weight}
                        onChange={(e) =>
                          handleWeightChange(
                            cat.code,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-24 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-black text-primary text-right focus:outline-none focus:ring-2 focus:ring-primary shadow-xs disabled:opacity-50"
                      />
                    </div>

                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-2 rounded-lg text-primary hover:bg-surface-container-high border border-outline-variant transition-colors cursor-pointer"
                      title="Edit Category Details"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-secondary" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat.code, cat.name)}
                      className="p-2 rounded-lg text-error hover:bg-error-container/20 border border-outline-variant transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-secondary" />
                <h3 className="text-base font-bold text-primary">
                  {editingCategory
                    ? `Edit Category (${editingCategory.code})`
                    : "Create New Risk Category"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-primary hover:text-error text-lg cursor-pointer font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-bold flex items-start gap-2 border border-error/40">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Category Code <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingCategory)}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. CREDIT_RISK, ESG_COMPLIANCE"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-mono font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                />
                {!editingCategory && (
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Unique identifier in capital letters, using underscores
                    instead of spaces.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Display Name <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Individual Credit & Repayment Risk"
                  className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Weight Allocation (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formWeight}
                    onChange={(e) =>
                      setFormWeight(parseFloat(e.target.value) || 0)
                    }
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                    Category Status
                  </label>
                  <select
                    value={formActive ? "active" : "inactive"}
                    onChange={(e) => setFormActive(e.target.value === "active")}
                    className="w-full px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active (Included in Scoring)</option>
                    <option value="inactive">Inactive (Excluded)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-primary mb-1 uppercase tracking-wider">
                  Description & Evaluation Focus
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explain what factors, evidence, and criteria are evaluated under this category..."
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
                  disabled={modalSaving}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {modalSaving
                    ? "Saving..."
                    : editingCategory
                      ? "Save Changes"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
