import { describe, it, expect } from "vitest";
import { pointInPolygon, nearestVertexDistanceKm } from "../lib/geo/pointInPolygon";
import type { FloodFeatureCollection, PowerGeometry } from "../types/geojson";
import raw from "./fixtures/georgia-demo-flood-sample.json";

const fx = raw as unknown as {
  zones: FloodFeatureCollection;
  testPoints: { inside: [number, number]; near: [number, number]; none: [number, number] };
};
const target = fx.zones.features[0]; // a real, irregular FEMA AE polygon

describe("pointInPolygon — real FEMA polygon", () => {
  it("point clearly inside → true", () => {
    expect(pointInPolygon(fx.testPoints.inside, target.geometry)).toBe(true);
  });
  it("point clearly outside (70 km away) → false", () => {
    expect(pointInPolygon(fx.testPoints.none, target.geometry)).toBe(false);
  });
  it("point just outside an edge (~0.18 km) → false", () => {
    expect(pointInPolygon(fx.testPoints.near, target.geometry)).toBe(false);
  });
});

describe("pointInPolygon — holes + MultiPolygon", () => {
  const withHole: PowerGeometry = {
    type: "Polygon",
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]],
    ],
  };
  it("inside the hole → false", () => {
    expect(pointInPolygon([5, 5], withHole)).toBe(false);
  });
  it("inside the ring but outside the hole → true", () => {
    expect(pointInPolygon([1, 1], withHole)).toBe(true);
  });

  const multi: PowerGeometry = {
    type: "MultiPolygon",
    coordinates: [
      [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      [[[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]]],
    ],
  };
  it("inside the second sub-polygon → true", () => {
    expect(pointInPolygon([10.5, 10.5], multi)).toBe(true);
  });
  it("between the two sub-polygons → false", () => {
    expect(pointInPolygon([5, 5], multi)).toBe(false);
  });
});

describe("nearestVertexDistanceKm", () => {
  it("returns a small positive distance for the near point", () => {
    const d = nearestVertexDistanceKm(fx.testPoints.near, target.geometry)!;
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(1);
  });
});
