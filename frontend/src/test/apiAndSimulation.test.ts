import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMethodology, updateMethodology, MethodologyConfig } from "../lib/api";

describe("Frontend Methodology API Client Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("getMethodology requests organization methodology endpoint", async () => {
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

  it("updateMethodology sends PUT request with customized config", async () => {
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
});
