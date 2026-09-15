import React, { useState, useEffect } from "react";
import { api, MethodologyConfig } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  ShieldCheck,
  HelpCircle,
  Percent,
} from "lucide-react";

export default function AdminMethodologyConfig() {
  const { user } = useAuth();
  const orgId = user?.organization_id || 1;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [dimension, setDimension] = useState<number>(5);
  const [weights, setWeights] = useState<Record<string, number>>({
    FINANCIAL: 25,
    OPERATIONAL: 25,
    STRATEGIC: 20,
    LEGAL_REGULATORY: 15,
    MARKET: 15,
  });
  const [bands, setBands] = useState<
    Array<{ name: string; min_score: number; max_score: number; color: string }>
  >([]);

  useEffect(() => {
    fetchMethodology();
  }, [orgId]);

  const fetchMethodology = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getMethodology(orgId);
      setDimension(data.matrix_dimension || 5);
      if (data.category_weights) {
        setWeights(data.category_weights);
      }
      if (data.score_bands) {
        setBands(data.score_bands);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load methodology settings");
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = Object.values(weights).reduce(
    (sum, w) => sum + (Number(w) || 0),
    0,
  );
  const isWeightValid = Math.abs(totalWeight - 100.0) <= 0.01;

  const handleWeightChange = (code: string, val: number) => {
    setWeights({
      ...weights,
      [code]: Math.max(0, val),
    });
  };

  const handleSave = async () => {
    if (!isWeightValid) {
      setErrorMsg(
        `Category weights must sum to exactly 100.0% (Current: ${Math.round(totalWeight * 100) / 100}%)`,
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      await api.updateMethodology(orgId, {
        matrix_dimension: dimension,
        category_weights: weights,
        score_bands: bands,
      });

      setSuccessMsg(
        "Organization risk methodology configuration saved successfully.",
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update methodology configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sliders className="w-7 h-7 text-indigo-600" />
            Risk Methodology & Scoring Engine Configurator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure dynamic matrix scales, category weighting, and
            classification bands for your enterprise.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMethodology}
            className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isWeightValid}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-800 text-sm rounded-xl border border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Matrix Dimension Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            1. Risk Matrix Dimensions
          </h2>
          <p className="text-xs text-gray-500">
            Select the grid scale used to assess Likelihood and Impact across
            your organization.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[3, 4, 5].map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => setDimension(dim)}
              className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                dimension === dim
                  ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-gray-900">
                  {dim} × {dim} Matrix
                </span>
                {dimension === dim && (
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                )}
              </div>
              <p className="text-xs text-gray-500">
                {dim === 3 &&
                  "Simple scale: Low, Med, High. Max inherent score 9."}
                {dim === 4 && "Balanced scale: 1 to 4. Max inherent score 16."}
                {dim === 5 &&
                  "Industry standard 5x5: Rare to Almost Certain. Max inherent 25."}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Category Weights Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              2. Enterprise Category Weighting
            </h2>
            <p className="text-xs text-gray-500">
              Weights dictate how each category score contributes to the
              Enterprise Risk Index (ERI).
            </p>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              isWeightValid
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            Total: {Math.round(totalWeight * 100) / 100}%{" "}
            {isWeightValid ? "(Valid)" : "(Must equal 100%)"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.keys(weights).map((code) => (
            <div
              key={code}
              className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between"
            >
              <div>
                <span className="text-sm font-semibold text-gray-800 block">
                  {code.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-gray-400">
                  Contribution weight
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={weights[code]}
                  onChange={(e) =>
                    handleWeightChange(code, Number(e.target.value))
                  }
                  className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-md text-sm font-bold text-right text-gray-800 focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Bands Preview */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            3. Classification Score Bands
          </h2>
          <p className="text-xs text-gray-500">
            Normalized scale (0 to 100) classification thresholds applied to all
            assessments.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {bands.map((b, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border text-center"
              style={{
                backgroundColor: `${b.color}10`,
                borderColor: `${b.color}40`,
              }}
            >
              <span
                className="block text-xs font-bold"
                style={{ color: b.color }}
              >
                {b.name}
              </span>
              <span className="block text-sm font-extrabold text-gray-800 mt-1">
                {b.min_score} - {b.max_score}
              </span>
              <span className="block text-[10px] text-gray-400 mt-0.5">
                points
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
