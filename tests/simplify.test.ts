import { describe, it, expect } from "vitest";
import { simplifyLine, simplifyGeometry, roundCoord } from "../lib/geo/simplify";
import type { Position } from "../types/geojson";

describe("simplifyLine (Douglas-Peucker)", () => {
  it("preserves endpoints", () => {
    const line: Position[] = [
      [0, 0],
      [1, 0.0001],
      [2, 0],
      [3, 0.0001],
      [4, 0],
    ];
    const out = simplifyLine(line, 0.01);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([4, 0]);
  });

  it("removes near-collinear vertices", () => {
    const line: Position[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ];
    expect(simplifyLine(line, 0.001)).toEqual([
      [0, 0],
      [4, 0],
    ]);
  });

  it("keeps a vertex that deviates beyond epsilon", () => {
    const line: Position[] = [
      [0, 0],
      [2, 1],
      [4, 0],
    ];
    expect(simplifyLine(line, 0.5)).toEqual([
      [0, 0],
      [2, 1],
      [4, 0],
    ]);
  });

  it("leaves a 2-point line unchanged", () => {
    expect(
      simplifyLine(
        [
          [0, 0],
          [1, 1],
        ],
        0.01,
      ),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});

describe("roundCoord", () => {
  it("rounds to N decimals", () => {
    expect(roundCoord([-84.3355123, 33.8355456], 5)).toEqual([-84.33551, 33.83555]);
  });
});

describe("simplifyGeometry", () => {
  it("leaves a Point intact (only rounds)", () => {
    expect(
      simplifyGeometry({ type: "Point", coordinates: [-84.3355123, 33.8355456] }, 0.0001, 5),
    ).toEqual({ type: "Point", coordinates: [-84.33551, 33.83555] });
  });

  it("reduces a dense near-straight LineString", () => {
    const coords: Position[] = Array.from({ length: 50 }, (_, i) => [i * 0.001, 0] as Position);
    const out = simplifyGeometry({ type: "LineString", coordinates: coords }, 0.0001, 6);
    if (out.type !== "LineString") throw new Error("expected LineString");
    expect(out.coordinates.length).toBeLessThan(coords.length);
    expect(out.coordinates[0]).toEqual([0, 0]);
  });

  it("keeps polygon rings closed", () => {
    const ring: Position[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ];
    const out = simplifyGeometry({ type: "Polygon", coordinates: [ring] }, 0.0001, 6);
    if (out.type !== "Polygon") throw new Error("expected Polygon");
    const r = out.coordinates[0];
    expect(r[0]).toEqual(r[r.length - 1]);
  });
});
