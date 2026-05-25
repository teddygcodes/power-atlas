import { describe, it, expect } from "vitest";
import { resolveCampusFloodRisk, floodSeverity } from "../lib/flood/floodResolver";
import { pointInPolygon } from "../lib/geo/pointInPolygon";
import type { FloodFeature, FloodFeatureCollection, Position } from "../types/geojson";
import type { DataCenterScenario } from "../types/scenario";
import raw from "./fixtures/georgia-demo-flood-sample.json";

const fx = raw as unknown as {
  zones: FloodFeatureCollection;
  testPoints: { inside: [number, number]; near: [number, number]; none: [number, number] };
};
const zones = fx.zones;
const scenario = (coordinates: [number, number]): DataCenterScenario => ({
  campusSizeMW: 100,
  coordinates,
});
const collection = (features: FloodFeature[]): FloodFeatureCollection => ({
  type: "FeatureCollection",
  features,
});

// Find a guaranteed-interior point of a polygon feature by grid sampling.
function insidePointOf(f: FloodFeature): [number, number] {
  const ring = (f.geometry as { coordinates: Position[][] }).coordinates[0];
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const [w, e, s, n] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  for (let i = 1; i < 40; i++)
    for (let j = 1; j < 40; j++) {
      const p: [number, number] = [w + ((e - w) * i) / 40, s + ((n - s) * j) / 40];
      if (pointInPolygon(p, f.geometry)) return p;
    }
  throw new Error("no interior point");
}

describe("floodSeverity (qualitative, from FEMA class)", () => {
  it("maps zone classes", () => {
    expect(floodSeverity("AE")).toBe("high");
    expect(floodSeverity("A")).toBe("high");
    expect(floodSeverity("VE")).toBe("high");
    expect(floodSeverity("X")).toBe("minimal");
    expect(floodSeverity("D")).toBe("unknown");
  });
});

describe("resolveCampusFloodRisk on REAL FEMA zones", () => {
  const xZone = zones.features.find((f) => f.properties.zoneClass === "X")!;

  it("INSIDE a real AE zone → high + zone class + caching caveat + derived", () => {
    const risk = resolveCampusFloodRisk({ scenario: scenario(fx.testPoints.inside), floodZones: zones });
    expect(risk.relationship).toBe("inside");
    expect(risk.severity).toBe("high");
    expect(risk.zoneClass).toBe("AE");
    expect(risk.riskStatus).toBe("derived");
    expect(risk.reasonCodes).toContain("campus_inside_mapped_flood_zone");
    expect(risk.warnings.some((w) => w.includes("msc.fema.gov"))).toBe(true);
  });

  it("NEAR (just outside) → near + nearest class + distance ≤ threshold", () => {
    const risk = resolveCampusFloodRisk({ scenario: scenario(fx.testPoints.near), floodZones: zones });
    expect(risk.relationship).toBe("near");
    expect(risk.zoneClass).toBe("AE");
    expect(typeof risk.distanceKm).toBe("number");
    expect(risk.distanceKm!).toBeLessThanOrEqual(1);
  });

  it("NONE (no nearby zone) → none + absence-isn't-proof caveat", () => {
    const risk = resolveCampusFloodRisk({ scenario: scenario(fx.testPoints.none), floodZones: zones });
    expect(risk.relationship).toBe("none");
    expect(risk.severity).toBe("unknown");
    expect(risk.reasonCodes).toContain("absence_not_proof_of_no_risk");
    expect(risk.warnings.some((w) => w.includes("proof of no risk"))).toBe(true);
  });

  it("INSIDE a real X zone → minimal severity", () => {
    const risk = resolveCampusFloodRisk({
      scenario: scenario(insidePointOf(xZone)),
      floodZones: collection([xZone]),
    });
    expect(risk.relationship).toBe("inside");
    expect(risk.severity).toBe("minimal");
    expect(risk.zoneClass).toBe("X");
  });

  it("emits NO probability/elevation magnitude; caveat always present; no path/capacity fields", () => {
    for (const pt of [fx.testPoints.inside, fx.testPoints.near, fx.testPoints.none]) {
      const risk = resolveCampusFloodRisk({ scenario: scenario(pt), floodZones: zones });
      expect(risk.warnings.some((w) => w.includes("statically cached FEMA"))).toBe(true);
      expect(JSON.stringify(risk)).not.toMatch(
        /\b\d+(\.\d+)?\s*(%|gpd|gallons?|MGD|feet|ft|year)\b|annual chance/i,
      );
      expect((risk as unknown as Record<string, unknown>).pathConfidence).toBeUndefined();
      expect((risk as unknown as Record<string, unknown>).capacityStatus).toBeUndefined();
    }
  });
});
