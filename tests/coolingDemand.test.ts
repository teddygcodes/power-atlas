import { describe, it, expect } from "vitest";
import { waterDemandClass, DEMAND_ORDINAL } from "../lib/cooling/waterDemand";

describe("waterDemandClass (MW + cooling → qualitative class)", () => {
  it("maps the small-MW row", () => {
    expect(waterDemandClass(100, "air")).toBe("low");
    expect(waterDemandClass(100, "hybrid")).toBe("moderate");
    expect(waterDemandClass(100, "evaporative")).toBe("high");
  });

  it("maps the large-MW row (evaporative is high either way)", () => {
    expect(waterDemandClass(500, "air")).toBe("moderate");
    expect(waterDemandClass(500, "hybrid")).toBe("high");
    expect(waterDemandClass(500, "evaporative")).toBe("high");
  });

  it("hybrid sits strictly between air and evaporative (small MW)", () => {
    const air = DEMAND_ORDINAL[waterDemandClass(100, "air")];
    const hybrid = DEMAND_ORDINAL[waterDemandClass(100, "hybrid")];
    const evap = DEMAND_ORDINAL[waterDemandClass(100, "evaporative")];
    expect(air).toBeLessThan(hybrid);
    expect(hybrid).toBeLessThan(evap);
  });

  it("default-equivalent (hybrid) reproduces the old MW-only thresholds", () => {
    // small + hybrid → moderate → minor_stream OK; large + hybrid → high → reservoir.
    expect(waterDemandClass(50, "hybrid")).toBe("moderate");
    expect(waterDemandClass(100, "hybrid")).toBe("moderate");
    expect(waterDemandClass(250, "hybrid")).toBe("high");
    expect(waterDemandClass(500, "hybrid")).toBe("high");
  });

  it("returns a qualitative class, never a number", () => {
    expect(typeof waterDemandClass(250, "evaporative")).toBe("string");
  });
});
