import { describe, it, expect } from "vitest";
import { getRepresentativeCoordinate } from "../lib/geo/centroid";
import { makeFeature, pt, line, poly, multiLine, multiPoly } from "./fixtures";

describe("getRepresentativeCoordinate", () => {
  it("returns the point for Point geometry", () => {
    expect(getRepresentativeCoordinate(makeFeature({ id: "n/1", geometry: pt(-84.3, 33.7) }))).toEqual([
      -84.3, 33.7,
    ]);
  });

  it("returns the middle vertex of a LineString (not the first)", () => {
    const f = makeFeature({
      id: "w/1",
      type: "transmission_line",
      geometry: line([
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
    });
    expect(getRepresentativeCoordinate(f)).toEqual([1, 1]);
  });

  it("computes the centroid of a square polygon (the main substation path)", () => {
    const f = makeFeature({
      id: "w/2",
      geometry: poly([
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ]),
    });
    const c = getRepresentativeCoordinate(f)!;
    expect(c[0]).toBeCloseTo(1, 9);
    expect(c[1]).toBeCloseTo(1, 9);
  });

  it("treats an unclosed ring the same as a closed one", () => {
    const closed = makeFeature({
      id: "a",
      geometry: poly([
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
          [0, 0],
        ],
      ]),
    });
    const open = makeFeature({
      id: "b",
      geometry: poly([
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 2],
        ],
      ]),
    });
    expect(getRepresentativeCoordinate(open)).toEqual(getRepresentativeCoordinate(closed));
  });

  it("picks the midpoint of the longest line for MultiLineString", () => {
    const f = makeFeature({
      id: "w/3",
      type: "transmission_line",
      geometry: multiLine([
        [
          [0, 0],
          [0, 0.1],
        ],
        [
          [10, 10],
          [10, 11],
          [10, 12],
        ],
      ]),
    });
    expect(getRepresentativeCoordinate(f)).toEqual([10, 11]);
  });

  it("uses the first polygon's centroid for MultiPolygon", () => {
    const f = makeFeature({
      id: "r/1",
      geometry: multiPoly([
        [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
        [
          [
            [100, 100],
            [101, 100],
            [101, 101],
            [100, 101],
            [100, 100],
          ],
        ],
      ]),
    });
    const c = getRepresentativeCoordinate(f)!;
    expect(c[0]).toBeCloseTo(1, 9);
    expect(c[1]).toBeCloseTo(1, 9);
  });

  it("returns null for an empty polygon", () => {
    expect(getRepresentativeCoordinate(makeFeature({ id: "empty", geometry: poly([]) }))).toBeNull();
  });
});
