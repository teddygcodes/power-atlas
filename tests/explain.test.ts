import { describe, it, expect } from "vitest";
import {
  explainPower,
  explainWater,
  explainFlood,
  reasonCodeLabel,
  findFeatureRawTags,
  type ExplainModel,
} from "../lib/explain/explain";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { resolveCandidateWaterDependency } from "../lib/water/waterResolver";
import { resolveCampusFloodRisk } from "../lib/flood/floodResolver";
import { representativeCoordinate } from "../lib/geo/centroid";
import type { PowerFeatureCollection, WaterFeatureCollection, FloodFeatureCollection } from "../types/geojson";
import type { DataCenterScenario } from "../types/scenario";
import powerRaw from "./fixtures/georgia-demo-sample.json";
import waterRaw from "./fixtures/georgia-demo-water-sample.json";
import floodRaw from "./fixtures/georgia-demo-flood-sample.json";

const power = powerRaw as unknown as {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
};
const water = waterRaw as unknown as WaterFeatureCollection;
const flood = floodRaw as unknown as {
  zones: FloodFeatureCollection;
  testPoints: { inside: [number, number]; near: [number, number]; none: [number, number] };
};

// Real resolved outputs — the explain helpers must SURFACE these verbatim.
const sub = power.substations.features.find((s) => s.properties.osmId === "way/34771030")!;
const subCoord = representativeCoordinate(sub)!;
const powerDep = resolveCandidatePowerDependency({
  scenario: { campusSizeMW: 100, coordinates: [subCoord[0] + 0.003, subCoord[1] + 0.003] },
  substations: power.substations,
  transmissionLines: power.transmissionLines,
})!;

const streamCoord = representativeCoordinate(water.features[0])!;
const waterScenario: DataCenterScenario = {
  campusSizeMW: 250,
  coordinates: [streamCoord[0] + 0.002, streamCoord[1] + 0.002],
  coolingType: "evaporative",
};
const waterDep = resolveCandidateWaterDependency({ scenario: waterScenario, waterFeatures: water })!;

const floodRisk = resolveCampusFloodRisk({
  scenario: { campusSizeMW: 100, coordinates: flood.testPoints.inside },
  floodZones: flood.zones,
});

// The text the drawer ADDS (labels), excluding values/caveats that come verbatim
// from the resolver output — this is where a fabricated number would sneak in.
function addedText(m: ExplainModel): string {
  return [
    ...m.reasonCodes.map((r) => r.label),
    ...m.posture.map((p) => p.label),
    ...m.rows.map((r) => r.label),
    m.title,
  ].join(" | ");
}
const NO_MAGNITUDE = /\b\d+(\.\d+)?\s*(MW|MWh|kV|volt|gpd|gallons?|MGD|%)\b/i;

describe("explainPower surfaces real resolver output", () => {
  it("carries the actual reason codes verbatim (+ human labels)", () => {
    const m = explainPower(powerDep);
    const codes = m.reasonCodes.map((r) => r.code);
    expect(codes).toEqual(powerDep.reasonCodes);
    expect(codes).toContain("nearest_visible_substation");
    expect(codes).toContain("capacity_unknown");
    // labels are faithful restatements, not the raw code
    expect(m.reasonCodes.find((r) => r.code === "capacity_unknown")!.label).toMatch(/capacity/i);
  });

  it("surfaces the real confidence/status posture + raw voltage tag", () => {
    const m = explainPower(powerDep);
    const posture = m.posture.map((p) => p.label);
    expect(posture).toContain(`Source: ${powerDep.sourceConfidence}`);
    expect(posture).toContain("Path: derived");
    expect(posture).toContain("Capacity: unknown");
    expect(posture).toContain("Verify externally");
    const voltageRow = m.rows.find((r) => r.label === "Voltage tag (raw)")!;
    expect(voltageRow.value).toBe(powerDep.voltage ?? "— missing —");
  });

  it("passes raw tags through verbatim when provided; never synthesizes", () => {
    const tags = findFeatureRawTags(power.substations, powerDep.featureId);
    const m = explainPower(powerDep, tags);
    expect(m.rawTags).toBe(tags);
  });
});

describe("explainWater surfaces real resolver output", () => {
  it("carries the actual reason codes + demand/type rows", () => {
    const m = explainWater(waterDep);
    expect(m.reasonCodes.map((r) => r.code)).toEqual(waterDep.reasonCodes);
    expect(m.reasonCodes.map((r) => r.code)).toContain("nearest_visible_water_source");
    expect(m.rows.find((r) => r.label === "Demand class")!.value.toLowerCase()).toBe(
      waterDep.demandClass,
    );
    expect(m.rows.find((r) => r.label === "Water class")!.value.toLowerCase()).toBe(
      waterDep.waterClass.replace(/_/g, " "),
    );
  });

  it("surfaces consistent posture (candidate / source / path / capacity / verify)", () => {
    const posture = explainWater(waterDep).posture.map((p) => p.label);
    expect(posture).toContain("Candidate");
    expect(posture).toContain("Capacity: unknown");
    expect(posture).toContain("Verify externally");
  });
});

describe("explainFlood surfaces real resolver output", () => {
  it("carries inside/zone-class/severity + the FEMA cached caveat, no rawTags", () => {
    const m = explainFlood(floodRisk);
    expect(m.reasonCodes.map((r) => r.code)).toEqual(floodRisk.reasonCodes);
    expect(m.reasonCodes.map((r) => r.code)).toContain("campus_inside_mapped_flood_zone");
    expect(m.rows.find((r) => r.label === "FEMA zone")!.value).toBe(floodRisk.zoneClass);
    expect(m.caveats.some((c) => c.includes("msc.fema.gov"))).toBe(true);
    expect(m.rawTags).toBeUndefined();
    expect(m.posture.map((p) => p.label)).toContain("Source: FEMA (cached)");
  });
});

describe("explain adds NO fabricated magnitude (capacity/spec numbers)", () => {
  it("the labels/posture the drawer adds carry no MW/MWh/kV/gpd/MGD/% value", () => {
    for (const m of [explainPower(powerDep), explainWater(waterDep), explainFlood(floodRisk)]) {
      expect(addedText(m)).not.toMatch(NO_MAGNITUDE);
    }
  });
});

describe("reasonCodeLabel + findFeatureRawTags", () => {
  it("restates known codes, formats flood_zone_*, falls back for unknown", () => {
    expect(reasonCodeLabel("nearest_visible_substation")).toBe("Nearest visible substation");
    expect(reasonCodeLabel("flood_zone_AE")).toBe("FEMA zone: AE");
    expect(reasonCodeLabel("some_unmapped_code")).toBe("some unmapped code");
  });

  it("every reason code the resolvers emitted here has a non-empty human label", () => {
    for (const dep of [powerDep, waterDep]) {
      for (const c of dep.reasonCodes) expect(reasonCodeLabel(c).length).toBeGreaterThan(0);
    }
    for (const c of floodRisk.reasonCodes) expect(reasonCodeLabel(c).length).toBeGreaterThan(0);
  });

  it("returns verbatim stored tags for a known id and undefined for a miss", () => {
    const tags = findFeatureRawTags(power.substations, powerDep.featureId);
    const match = power.substations.features.find((f) => f.properties.id === powerDep.featureId)!;
    expect(tags).toBe(match.properties.rawTags);
    expect(findFeatureRawTags(power.substations, "no/such/id")).toBeUndefined();
  });
});
