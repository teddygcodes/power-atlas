import { describe, it, expect } from "vitest";
import { resolveCandidateWaterDependency } from "../lib/water/waterResolver";
import { getRepresentativeCoordinate } from "../lib/geo/centroid";
import { emptyWaterFeatureCollection } from "../types/geojson";
import type { WaterFeature, WaterFeatureCollection } from "../types/geojson";
import type { CampusSizeMW, DataCenterScenario } from "../types/scenario";
import sampleRaw from "./fixtures/georgia-demo-water-sample.json";

const water = sampleRaw as unknown as WaterFeatureCollection;

const scenario = (mw: CampusSizeMW, coordinates: [number, number]): DataCenterScenario => ({
  campusSizeMW: mw,
  coordinates,
});
const collection = (features: WaterFeature[]): WaterFeatureCollection => ({
  type: "FeatureCollection",
  features,
});
function byId(id: string): WaterFeature {
  const f = water.features.find((w) => w.properties.osmId === id);
  if (!f) throw new Error(`fixture missing ${id}`);
  return f;
}

const stream = byId("way/28961265"); // North Fork Peachtree Creek (minor_stream)
const river = byId("way/484301357"); // Chattahoochee River (major_river)
const lake = byId("way/33276079"); // Cadence Lake (reservoir polygon)

// Campus right next to the stream; the river is ~11 km away, the lake ~14 km.
const streamCoord = getRepresentativeCoordinate(stream)!;
const campusByStream: [number, number] = [streamCoord[0] + 0.002, streamCoord[1] + 0.002];

describe("water resolver against REAL georgia-demo features", () => {
  it("loads a real fixture with a river, a reservoir polygon, and a stream", () => {
    expect(stream.properties.waterType).toBe("stream");
    expect(river.properties.waterType).toBe("river");
    expect(lake.geometry.type).toBe("Polygon");
  });

  it("LARGE campus prefers a real major river over a CLOSER minor stream", () => {
    const dep = resolveCandidateWaterDependency({
      scenario: scenario(500, campusByStream),
      waterFeatures: water,
    })!;
    expect(dep.featureId).toBe(river.properties.id); // the river, not the closer stream
    expect(dep.featureId).not.toBe(stream.properties.id);
    expect(dep.waterClass).toBe("major_river");
    expect(dep.reasonCodes).toContain("water_type_major_river");
    expect(dep.reasonCodes).toContain("proximity_not_water_rights");
    expect(dep.capacityStatus).toBe("unknown");
    expect(dep.warnings.some((w) => w.includes("water rights"))).toBe(true);
  });

  it("SMALL campus by the stream picks the nearest (stream is acceptable)", () => {
    const dep = resolveCandidateWaterDependency({
      scenario: scenario(50, campusByStream),
      waterFeatures: water,
    })!;
    expect(dep.featureId).toBe(stream.properties.id);
    expect(dep.waterClass).toBe("minor_stream");
    expect(dep.reasonCodes).toContain("water_type_minor_stream");
  });

  it("resolves a reservoir polygon via its centroid", () => {
    const lakeCoord = getRepresentativeCoordinate(lake)!;
    const campus: [number, number] = [lakeCoord[0] + 0.002, lakeCoord[1] + 0.002];
    const dep = resolveCandidateWaterDependency({
      scenario: scenario(50, campus),
      waterFeatures: collection([lake]),
    })!;
    expect(dep.featureId).toBe(lake.properties.id);
    expect(dep.candidateCoordinates).toEqual(lakeCoord);
  });

  it("resolves a river via its line midpoint (not a polygon centroid)", () => {
    const dep = resolveCandidateWaterDependency({
      scenario: scenario(500, campusByStream),
      waterFeatures: collection([river]),
    })!;
    expect(dep.candidateCoordinates).toEqual(getRepresentativeCoordinate(river));
  });

  it("minor-stream-only + LARGE load: returned as candidate WITH insufficiency warning, NOT excluded", () => {
    const dep = resolveCandidateWaterDependency({
      scenario: scenario(500, campusByStream),
      waterFeatures: collection([stream]),
    })!;
    expect(dep.featureId).toBe(stream.properties.id); // surfaced, not excluded
    expect(dep.reasonCodes).toContain("water_type_minor_stream");
    expect(dep.warnings.some((w) => w.includes("likely insufficient"))).toBe(true);
    expect(dep.capacityStatus).toBe("unknown");
  });

  it("unknown water type is not excluded", () => {
    const unknownFeat: WaterFeature = {
      ...stream,
      properties: {
        ...stream.properties,
        id: "test/unknown",
        osmId: "test/unknown",
        waterType: "unknown_water",
      },
    };
    const c = getRepresentativeCoordinate(unknownFeat)!;
    const dep = resolveCandidateWaterDependency({
      scenario: scenario(50, [c[0] + 0.002, c[1] + 0.002]),
      waterFeatures: collection([unknownFeat]),
    })!;
    expect(dep.featureId).toBe("test/unknown");
    expect(dep.reasonCodes).toContain("water_type_unknown");
  });

  it("returns null when there are no water features", () => {
    expect(
      resolveCandidateWaterDependency({
        scenario: scenario(100, [0, 0]),
        waterFeatures: emptyWaterFeatureCollection(),
      }),
    ).toBeNull();
  });
});
