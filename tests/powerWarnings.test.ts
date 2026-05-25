import { describe, it, expect } from "vitest";
import { buildPowerWarnings } from "../lib/power/powerWarnings";

describe("buildPowerWarnings", () => {
  it("always includes exactly the three base warnings when voltage is present and load is small", () => {
    const w = buildPowerWarnings({ campusSizeMW: 50, voltage: "115000" });
    expect(w).toHaveLength(3);
    expect(w[0]).toMatch(/candidate visible power dependency derived from public OSM data/);
  });

  it("adds a missing-voltage warning when voltage is absent", () => {
    const w = buildPowerWarnings({ campusSizeMW: 50 });
    expect(w).toContain("OSM voltage tag is missing for this feature.");
  });

  it("adds a very-large warning at >= 250 MW only", () => {
    expect(
      buildPowerWarnings({ campusSizeMW: 250, voltage: "x" }).some((s) =>
        s.includes("very large load class"),
      ),
    ).toBe(true);
    expect(
      buildPowerWarnings({ campusSizeMW: 100, voltage: "x" }).some((s) =>
        s.includes("very large load class"),
      ),
    ).toBe(false);
  });

  it("adds the hyperscale warning only at 500 MW", () => {
    expect(
      buildPowerWarnings({ campusSizeMW: 500, voltage: "x" }).some((s) =>
        s.includes("hyperscale load"),
      ),
    ).toBe(true);
    expect(
      buildPowerWarnings({ campusSizeMW: 250, voltage: "x" }).some((s) =>
        s.includes("hyperscale load"),
      ),
    ).toBe(false);
  });

  it("adds the low-for-load warning only when voltageClassLowForLoad is set", () => {
    const withFlag = buildPowerWarnings({
      campusSizeMW: 500,
      voltage: "115000",
      voltageClassLowForLoad: true,
    });
    expect(withFlag.some((s) => s.includes("appears low for this load class"))).toBe(true);

    const withoutFlag = buildPowerWarnings({ campusSizeMW: 500, voltage: "230000" });
    expect(withoutFlag.some((s) => s.includes("appears low for this load class"))).toBe(false);
  });
});
