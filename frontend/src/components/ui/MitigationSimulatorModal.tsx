import React, { useState, useEffect } from "react";
import { api, SimulationResult, IdentifiedRisk } from "../../lib/api";
import {
  Sparkles,
  Sliders,
  X,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Calculator,
} from "lucide-react";

interface MitigationSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRisk?: IdentifiedRisk | null;
}

export const MitigationSimulatorModal: React.FC<
  MitigationSimulatorModalProps
> = ({ isOpen, onClose, initialRisk }) => {
  const [inherentRisk, setInherentRisk] = useState<number>(
    initialRisk?.inherent_risk || 20,
  );
  const [currentResidual, setCurrentResidual] = useState<number>(
    initialRisk?.residual_risk || 20,
  );
  const [controls, setControls] = useState<
    Array<{ control_name: string; effectiveness_pct: number }>
  >([
    {
      control_name: "Enhanced Multi-Factor Authentication",
      effectiveness_pct: 60,
    },
  ]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRisk) {
      setInherentRisk(initialRisk.inherent_risk || 20);
      setCurrentResidual(
        initialRisk.residual_risk || initialRisk.inherent_risk || 20,
      );
    }
  }, [initialRisk]);

  const runSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.simulateRiskMitigation({
        risk_id: initialRisk?.id,
        inherent_risk: inherentRisk,
        current_residual: currentResidual,
        proposed_controls: controls,
      });
      setSimulation(res.simulation);
    } catch (err: any) {
      setError(err.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runSimulation();
    }
  }, [isOpen, inherentRisk, currentResidual, controls]);

  if (!isOpen) return null;

  const addControl = () => {
    setControls([...controls, { control_name: "", effectiveness_pct: 50 }]);
  };

  const removeControl = (index: number) => {
    setControls(controls.filter((_, idx) => idx !== index));
  };

  const updateControl = (index: number, field: string, value: any) => {
    const updated = [...controls];
    updated[index] = { ...updated[index], [field]: value };
    setControls(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                What-If Mitigation Impact Simulator
              </h3>
              <p className="text-xs text-gray-500">
                {initialRisk
                  ? `Forecasting for: ${initialRisk.risk_name}`
                  : "Forecast risk reduction before allocating budget"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Baseline Values */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Inherent Risk Score
              </label>
              <input
                type="number"
                min="1"
                max="25"
                value={inherentRisk}
                onChange={(e) => setInherentRisk(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Current Residual Risk
              </label>
              <input
                type="number"
                min="1"
                max="25"
                value={currentResidual}
                onChange={(e) => setCurrentResidual(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Proposed Controls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Hypothetical / Proposed Mitigations
              </label>
              <button
                onClick={addControl}
                className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Control
              </button>
            </div>

            <div className="space-y-3">
              {controls.map((ctrl, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200"
                >
                  <input
                    type="text"
                    placeholder="e.g. Automated patch management"
                    value={ctrl.control_name}
                    onChange={(e) =>
                      updateControl(idx, "control_name", e.target.value)
                    }
                    className="flex-1 text-sm px-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center space-x-2 w-36">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={ctrl.effectiveness_pct}
                      onChange={(e) =>
                        updateControl(
                          idx,
                          "effectiveness_pct",
                          Number(e.target.value),
                        )
                      }
                      className="w-20 accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-700 w-10 text-right">
                      {ctrl.effectiveness_pct}%
                    </span>
                  </div>
                  <button
                    onClick={() => removeControl(idx)}
                    className="text-gray-400 hover:text-red-600 p-1 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation Output Card */}
          {simulation && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                  Projected Risk Outcome
                </span>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-600 text-white shadow-sm">
                  {simulation.projectedClassification}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100">
                  <span className="block text-[11px] text-gray-500">
                    Current Score
                  </span>
                  <span className="text-lg font-extrabold text-gray-800">
                    {simulation.currentResidual}
                  </span>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100">
                  <span className="block text-[11px] text-gray-500">
                    Projected Score
                  </span>
                  <span className="text-lg font-extrabold text-emerald-600">
                    {simulation.projectedResidual}
                  </span>
                </div>
                <div className="bg-white/80 p-3 rounded-lg border border-indigo-100">
                  <span className="block text-[11px] text-gray-500">
                    Risk Reduction
                  </span>
                  <span className="text-lg font-extrabold text-indigo-600">
                    -{simulation.deltaPoints} pts (
                    {simulation.reductionPercentage}%)
                  </span>
                </div>
              </div>

              {/* Plain Language Mathematical Breakdown */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 text-xs text-gray-700 leading-relaxed font-mono">
                <span className="font-sans font-bold text-gray-900 block mb-1">
                  Explainability Breakdown:
                </span>
                {simulation.explanation}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
            In-memory simulation only. No database modifications made.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
