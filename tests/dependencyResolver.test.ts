import { describe, it, expect } from "vitest";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { makeFeature, fc, pt, line } from "./fixtures";
import { haversineKm } from "../lib/geo/distance";
import type { CampusSizeMW, DataCenterScenario } from "../types/scenario";

const CAMPUS: [number, number] = [0, 0];
const scenario = (mw: CampusSizeMW): DataCenterScenario => ({
  campusSizeMW: mw,
  coordinates: CAMPUS,
});

describe("resolveCandidatePowerDependency", () => {
  it("returns null when there are no substations and no transmission lines", () => {
    expect(
      resolveCandidatePowerDependency({
        scenario: scenario(100),
        substations: fc([]),
        transmissionLines: fc([]),
      }),
    ).toBeNull();
  });

  it("chooses the nearest SUBSTATION even when a transmission line is closer", () => {
    const closerLine = makeFeature({
      id: "line/close",
      type: "transmission_line",
      geometry: line([
        [0, 0.001],
        [0, 0.002],
      ]),
    });
    const fartherSub = makeFeature({ id: "sub/far", geometry: pt(0, 0.05), voltage: "115000" });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100),
      substations: fc([fartherSub]),
      transmissionLines: fc([closerLine]),
    })!;
    expect(dep.featureType).toBe("substation");
    expect(dep.featureId).toBe("sub/far");
    expect(dep.reasonCodes).toContain("nearest_visible_substation");
    expect(dep.reasonCodes).not.toContain("nearest_visible_transmission_line");
  });

  it("falls back to the nearest transmission line ONLY when there are no substations", () => {
    const tline = makeFeature({
      id: "line/1",
      type: "transmission_line",
      geometry: line([
        [0, 0.01],
        [0, 0.02],
        [0, 0.03],
      ]),
      voltage: "230000",
    });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100),
      substations: fc([]),
      transmissionLines: fc([tline]),
    })!;
    expect(dep.featureType).toBe("transmission_line");
    expect(dep.reasonCodes).toContain("nearest_visible_transmission_line");
  });

  it("preserves the raw voltage string verbatim (incl. multi-voltage)", () => {
    const sub = makeFeature({ id: "sub/mv", geometry: pt(0, 0.01), voltage: "115000;46000;12000" });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(50),
      substations: fc([sub]),
      transmissionLines: fc([]),
    })!;
    expect(dep.voltage).toBe("115000;46000;12000");
    expect(dep.reasonCodes).toContain("has_voltage_tag");
  });

  it("flags missing voltage and never claims capacity or connectivity", () => {
    const sub = makeFeature({ id: "sub/nov", geometry: pt(0, 0.01) });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(50),
      substations: fc([sub]),
      transmissionLines: fc([]),
    })!;
    expect(dep.voltage).toBeUndefined();
    expect(dep.reasonCodes).toContain("missing_voltage_tag");
    expect(dep.reasonCodes).toContain("capacity_unknown");
    expect(dep.reasonCodes).toContain("proximity_not_connectivity");
    expect(dep.capacityStatus).toBe("unknown");
    expect(dep.pathConfidence).toBe("derived");
    expect(dep.sourceConfidence).toBe("community");
  });

  it("adds transmission_substation_tag_present when the substation tag is 'transmission'", () => {
    const sub = makeFeature({
      id: "sub/t",
      geometry: pt(0, 0.01),
      voltage: "230000",
      substationType: "transmission",
    });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100),
      substations: fc([sub]),
      transmissionLines: fc([]),
    })!;
    expect(dep.reasonCodes).toContain("transmission_substation_tag_present");
  });

  it("picks the NEAREST substation among several (not just substation-over-line)", () => {
    const near = makeFeature({ id: "sub/near", geometry: pt(0, 0.01), voltage: "115000" });
    const mid = makeFeature({ id: "sub/mid", geometry: pt(0, 0.5), voltage: "115000" });
    const far = makeFeature({ id: "sub/far", geometry: pt(0, 2), voltage: "115000" });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100),
      substations: fc([far, mid, near]), // deliberately not in nearest-first order
      transmissionLines: fc([]),
    })!;
    expect(dep.featureId).toBe("sub/near");
  });

  it("runs all four MW sizes through the resolver: load class, requirement, escalated warnings", () => {
    const sub = makeFeature({ id: "s", geometry: pt(0, 0.01), voltage: "115000" });
    const base = { substations: fc([sub]), transmissionLines: fc([]) };
    const cases: {
      mw: CampusSizeMW;
      loadClass: string;
      requirement: RegExp;
      veryLarge: boolean;
      hyperscale: boolean;
    }[] = [
      { mw: 50, loadClass: "moderate", requirement: /interconnection study/, veryLarge: false, hyperscale: false },
      { mw: 100, loadClass: "large", requirement: /Dedicated utility planning/, veryLarge: false, hyperscale: false },
      { mw: 250, loadClass: "very_large", requirement: /grid upgrade/, veryLarge: true, hyperscale: false },
      { mw: 500, loadClass: "extreme", requirement: /Hyperscale/, veryLarge: true, hyperscale: true },
    ];
    for (const c of cases) {
      const dep = resolveCandidatePowerDependency({ scenario: scenario(c.mw), ...base })!;
      expect(dep.loadClass, `loadClass @ ${c.mw}MW`).toBe(c.loadClass);
      expect(dep.likelyRequirement, `requirement @ ${c.mw}MW`).toMatch(c.requirement);
      // Escalated warnings must appear in the resolver's RETURNED warnings array.
      expect(
        dep.warnings.some((w) => w.includes("very large load class")),
        `very-large warning @ ${c.mw}MW`,
      ).toBe(c.veryLarge);
      expect(
        dep.warnings.some((w) => w.includes("hyperscale load")),
        `hyperscale warning @ ${c.mw}MW`,
      ).toBe(c.hyperscale);
    }
  });

  it("rounds distance to exactly 3 decimals, matching the centroid-based haversine", () => {
    const sub = makeFeature({ id: "s", geometry: pt(0, 0.01), voltage: "1" });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(50),
      substations: fc([sub]),
      transmissionLines: fc([]),
    })!;
    const expected = Math.round(haversineKm([0, 0], [0, 0.01]) * 1000) / 1000;
    expect(dep.distanceKm).toBe(expected);
  });
});
