import { describe, it, expect } from "vitest";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { getRepresentativeCoordinate } from "../lib/geo/centroid";
import { haversineKm } from "../lib/geo/distance";
import { emptyFeatureCollection } from "../types/geojson";
import type { PowerFeature, PowerFeatureCollection, Position } from "../types/geojson";
import type { CampusSizeMW, DataCenterScenario } from "../types/scenario";
import sampleRaw from "./fixtures/georgia-demo-sample.json";

// Real features pulled verbatim from the ingested georgia-demo GeoJSON.
const sample = sampleRaw as unknown as {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
};
const { substations, transmissionLines } = sample;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const scenario = (mw: CampusSizeMW, coordinates: [number, number]): DataCenterScenario => ({
  campusSizeMW: mw,
  coordinates,
});

function byOsmId(id: string): PowerFeature {
  const f = substations.features.find((s) => s.properties.osmId === id);
  if (!f) throw new Error(`fixture missing ${id}`);
  return f;
}

function exteriorRing(f: PowerFeature): Position[] {
  const g = f.geometry;
  if (g.type === "Polygon") return g.coordinates[0];
  if (g.type === "MultiPolygon") return g.coordinates[0][0];
  throw new Error(`${f.properties.osmId} is not a polygon`);
}

// Ray-casting point-in-polygon for the exterior ring.
function pointInRing(pt: [number, number], ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

describe("resolver against REAL georgia-demo features", () => {
  it("loads a real, irregular-polygon fixture", () => {
    expect(substations.features.length).toBeGreaterThanOrEqual(3);
    // The dataset is polygon-dominated, just like the real ~97%.
    const polygonish = substations.features.filter(
      (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon",
    );
    expect(polygonish.length).toBe(substations.features.length);
  });

  it("runs the FULL path on a real Polygon substation: centroid → nearest → resolver", () => {
    const target = byOsmId("way/34771030"); // real Polygon, 9 vertices, voltage 230000
    expect(target.geometry.type).toBe("Polygon");

    const centroid = getRepresentativeCoordinate(target)!;
    // Centroid of the real irregular ring sits inside the polygon.
    expect(pointInRing(centroid, exteriorRing(target))).toBe(true);

    // Campus placed ~0.3 km from this substation; the next-nearest fixture
    // substation is >21 km away, so this one is unambiguously the candidate.
    const campus: [number, number] = [centroid[0] + 0.003, centroid[1] + 0.003];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100, campus),
      substations,
      transmissionLines,
    })!;

    expect(dep.featureType).toBe("substation");
    expect(dep.featureId).toBe(target.properties.id);
    expect(dep.voltage).toBe("230000"); // real raw voltage, verbatim
    // Distance is measured from the centroid, not the raw geometry.
    expect(dep.candidateCoordinates).toEqual(centroid);
    expect(dep.distanceKm).toBe(round3(haversineKm(campus, centroid)));
    expect(dep.distanceKm).toBeGreaterThan(0);
  });

  it("measures distance from the centroid, NOT a boundary vertex", () => {
    const target = byOsmId("way/34771030");
    const centroid = getRepresentativeCoordinate(target)!;
    const campus: [number, number] = [centroid[0] + 0.003, centroid[1] + 0.003];
    const firstVertex = exteriorRing(target)[0] as [number, number];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100, campus),
      substations,
      transmissionLines,
    })!;

    // The centroid is genuinely distinct from the ring's first vertex, and the
    // resolver uses the centroid — so the reported values must differ from the
    // vertex-based ones. This is what makes the polygon-centroid path matter.
    expect(centroid).not.toEqual(firstVertex);
    expect(dep.candidateCoordinates).not.toEqual(firstVertex);
    expect(dep.distanceKm).not.toBe(round3(haversineKm(campus, firstVertex)));
  });

  it("also resolves a real MultiPolygon substation via its centroid", () => {
    const target = byOsmId("relation/14128477"); // real MultiPolygon
    expect(target.geometry.type).toBe("MultiPolygon");

    const centroid = getRepresentativeCoordinate(target)!;
    const campus: [number, number] = [centroid[0] + 0.002, centroid[1] + 0.002];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(250, campus),
      substations,
      transmissionLines,
    })!;

    expect(dep.featureType).toBe("substation");
    expect(dep.featureId).toBe(target.properties.id);
    expect(dep.candidateCoordinates).toEqual(centroid);
  });

  it("falls back to the nearest real transmission line when no substations exist", () => {
    const line = transmissionLines.features[0];
    const lineCoord = getRepresentativeCoordinate(line)!;
    const campus: [number, number] = [lineCoord[0] + 0.002, lineCoord[1] + 0.002];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(100, campus),
      substations: emptyFeatureCollection(),
      transmissionLines,
    })!;

    expect(dep.featureType).toBe("transmission_line");
    expect(dep.reasonCodes).toContain("nearest_visible_transmission_line");
    expect(dep.candidateCoordinates).toEqual(lineCoord);
  });
});

function collection(features: PowerFeature[]): PowerFeatureCollection {
  return { type: "FeatureCollection", features };
}

describe("voltage-class plausibility on REAL features", () => {
  const sub230 = byOsmId("way/34771030"); // 230 kV → transmission
  const sub115 = byOsmId("way/34832866"); // 115 kV → sub_transmission

  it("a 500 MW load prefers the real 230 kV substation over a CLOSER 115 kV one", () => {
    // Campus sits right next to the 115 kV substation; the nearest 230 kV one is
    // ~26 km away. Distance alone would pick the 115 kV; voltage plausibility wins.
    const c115 = getRepresentativeCoordinate(sub115)!;
    const campus: [number, number] = [c115[0] + 0.002, c115[1] + 0.002];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(500, campus),
      substations, // full fixture: both 230 kV subs + the 115 kV sub
      transmissionLines,
    })!;

    expect(dep.featureId).toBe(sub230.properties.id); // the transmission-class one
    expect(dep.featureId).not.toBe(sub115.properties.id); // not the closer low one
    expect(dep.reasonCodes).toContain("voltage_class_plausible");
    expect(dep.capacityStatus).toBe("unknown"); // never a capacity claim
  });

  it("at 50 MW the same campus picks the CLOSER 115 kV substation (it's plausible there)", () => {
    // At 50 MW, sub_transmission (115 kV) is plausible, so distance decides and
    // the nearby 115 kV substation wins — confirms the heuristic is load-aware.
    const c115 = getRepresentativeCoordinate(sub115)!;
    const campus: [number, number] = [c115[0] + 0.002, c115[1] + 0.002];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(50, campus),
      substations,
      transmissionLines,
    })!;

    expect(dep.featureId).toBe(sub115.properties.id);
    expect(dep.reasonCodes).toContain("voltage_class_plausible");
  });

  it("low_for_load: a 500 MW load with ONLY the 115 kV substation returns it, flagged", () => {
    const c115 = getRepresentativeCoordinate(sub115)!;
    const campus: [number, number] = [c115[0] + 0.002, c115[1] + 0.002];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(500, campus),
      substations: collection([sub115]),
      transmissionLines,
    })!;

    expect(dep.featureId).toBe(sub115.properties.id); // not excluded
    expect(dep.voltage).toBe("115000"); // raw string preserved, never overwritten
    expect(dep.reasonCodes).toContain("voltage_class_low_for_load");
    expect(
      dep.warnings.some((w) => w.includes("appears low for this load class")),
    ).toBe(true);
    expect(dep.capacityStatus).toBe("unknown");
  });

  it("unknown voltage: a tag-stripped substation classes unknown and is NOT excluded", () => {
    const noVoltage: PowerFeature = {
      ...sub230,
      properties: { ...sub230.properties, voltage: undefined },
    };
    const c = getRepresentativeCoordinate(noVoltage)!;
    const campus: [number, number] = [c[0] + 0.002, c[1] + 0.002];

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(500, campus),
      substations: collection([noVoltage]),
      transmissionLines,
    })!;

    expect(dep.featureId).toBe(sub230.properties.id);
    expect(dep.reasonCodes).toContain("voltage_class_unknown");
    expect(dep.capacityStatus).toBe("unknown");
  });

  it("tier order: unknown-voltage outranks a same-distance low-for-load substation", () => {
    // Both placed equally near the campus; at 500 MW the 115 kV is low-for-load
    // while the tag-stripped one is a data gap — the data gap ranks higher.
    const c115 = getRepresentativeCoordinate(sub115)!;
    const campus: [number, number] = [c115[0] + 0.001, c115[1] + 0.001];
    const unknownAtSamePlace: PowerFeature = {
      ...sub115,
      properties: { ...sub115.properties, id: "test/unknown", osmId: "test/unknown", voltage: undefined },
    };

    const dep = resolveCandidatePowerDependency({
      scenario: scenario(500, campus),
      substations: collection([sub115, unknownAtSamePlace]),
      transmissionLines,
    })!;

    expect(dep.featureId).toBe("test/unknown");
    expect(dep.reasonCodes).toContain("voltage_class_unknown");
  });
});
