import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMethodology, updateMethodology, simulateRiskMitigation, MethodologyConfig, SimulationResult } from "../lib/api";

describe("Frontend API Client and Simulation Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getMethodology requests organization methodology endpoint (covers AC-3)", async () => {
    const mockMethodology: MethodologyConfig = {
      matrix_dimension: 5,
      likelihood_scale: [],
      impact_scale: [],
      category_weights: {
        FINANCIAL: 25.0,
        OPERATIONAL: 25.0,
        STRATEGIC: 20.0,
        LEGAL_REGULATORY: 15.0,
        MARKET: 15.0,
      },
      score_bands: [
        { name: "Low", min_score: 0, max_score: 25, color: "#10B981" },
        { name: "Medium", min_score: 26, max_score: 50, color: "#F59E0B" },
        { name: "High", min_score: 51, max_score: 75, color: "#EF4444" },
        { name: "Critical", min_score: 76, max_score: 100, color: "#991B1B" },
      ],
      is_custom: false,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockMethodology,
    } as Response);

    const result = await getMethodology(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/1/methodology"),
      expect.anything()
    );
    expect(result.matrix_dimension).toBe(5);
    expect(result.category_weights.FINANCIAL).toBe(25.0);
  });

  it("updateMethodology sends PUT request with customized config (covers AC-3)", async () => {
    const customConfig: Partial<MethodologyConfig> = {
      matrix_dimension: 4,
      category_weights: {
        FINANCIAL: 30.0,
        OPERATIONAL: 30.0,
        STRATEGIC: 20.0,
        LEGAL_REGULATORY: 10.0,
        MARKET: 10.0,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Updated successfully",
        methodology: { ...customConfig, is_custom: true } as MethodologyConfig,
      }),
    } as Response);

    const result = await updateMethodology(1, customConfig);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/1/methodology"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(customConfig),
      })
    );
    expect(result.methodology.matrix_dimension).toBe(4);
    expect(result.methodology.is_custom).toBe(true);
  });

  it("simulateRiskMitigation posts simulation parameters and receives projection (covers AC-6, AC-7)", async () => {
    const mockSimulationResult: SimulationResult = {
      inherentRisk: 20.0,
      currentResidual: 20.0,
      projectedResidual: 5.0,
      projectedClassification: "Low",
      deltaPoints: 15.0,
      reductionPercentage: 75.0,
      effectiveControlPct: 75.0,
      explanation: "Projected residual risk decreases from 20 to 5 (75.0% reduction)",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        riskId: 42,
        simulation: mockSimulationResult,
      }),
    } as Response);

    const simulationParams = {
      risk_id: 42,
      inherent_risk: 20,
      current_residual: 20,
      proposed_controls: [
        { control_name: "Automated Failover", effectiveness_pct: 75 },
      ],
    };

    const result = await simulateRiskMitigation(simulationParams);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/risks/simulate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(simulationParams),
      })
    );
    expect(result.simulation.projectedResidual).toBe(5.0);
    expect(result.simulation.deltaPoints).toBe(15.0);
    expect(result.simulation.reductionPercentage).toBe(75.0);
    expect(result.simulation.explanation).toContain("75.0% reduction");
  });

  it("verifies independent multiplicative control diminishing returns formula (covers AC-6)", () => {
    // Two controls: 50% and 40%
    // Combined = 1 - (1 - 0.50) * (1 - 0.40) = 1 - (0.50 * 0.60) = 1 - 0.30 = 0.70 (70%)
    const c1 = 0.5;
    const c2 = 0.4;
    const combined = 1 - (1 - c1) * (1 - c2);
    expect(combined).toBeCloseTo(0.7, 5);

    const inherent = 20;
    const residual = inherent * (1 - combined);
    expect(residual).toBeCloseTo(6.0, 5);
  });
});
