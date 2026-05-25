import { describe, it, expect } from "vitest";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { makeFeature, fc, pt, line } from "./fixtures";
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

  it("derives load class and likely requirement from campus size", () => {
    const sub = makeFeature({ id: "s", geometry: pt(0, 0.01), voltage: "115000" });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(500),
      substations: fc([sub]),
      transmissionLines: fc([]),
    })!;
    expect(dep.loadClass).toBe("extreme");
    expect(dep.likelyRequirement).toMatch(/Hyperscale/);
  });

  it("rounds distance to at most 3 decimals", () => {
    const sub = makeFeature({ id: "s", geometry: pt(0, 0.01), voltage: "1" });
    const dep = resolveCandidatePowerDependency({
      scenario: scenario(50),
      substations: fc([sub]),
      transmissionLines: fc([]),
    })!;
    const decimals = (dep.distanceKm.toString().split(".")[1] ?? "").length;
    expect(decimals).toBeLessThanOrEqual(3);
  });
});
