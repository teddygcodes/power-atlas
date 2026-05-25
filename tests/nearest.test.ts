import { describe, it, expect } from "vitest";
import { nearestFeature } from "../lib/geo/nearest";
import { makeFeature, pt, poly } from "./fixtures";

const near = makeFeature({ id: "near", geometry: pt(0, 0.01) });
const far = makeFeature({ id: "far", geometry: pt(5, 5) });

describe("nearestFeature", () => {
  it("returns null for an empty list", () => {
    expect(nearestFeature([0, 0], [])).toBeNull();
  });

  it("returns the closest feature by representative coordinate", () => {
    const res = nearestFeature([0, 0], [far, near])!;
    expect(res.feature.properties.id).toBe("near");
    expect(res.distanceKm).toBeGreaterThan(0);
    expect(res.coordinates).toEqual([0, 0.01]);
  });

  it("skips features with no representative coordinate", () => {
    const noCoord = makeFeature({ id: "no-coord", geometry: poly([]) });
    const res = nearestFeature([0, 0], [noCoord, near])!;
    expect(res.feature.properties.id).toBe("near");
  });
});
