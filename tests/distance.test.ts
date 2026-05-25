import { describe, it, expect } from "vitest";
import { haversineKm } from "../lib/geo/distance";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm([-84.39, 33.75], [-84.39, 33.75])).toBe(0);
  });

  it("approximates ~111 km per degree of latitude", () => {
    const d = haversineKm([0, 0], [0, 1]);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it("is symmetric", () => {
    const a: [number, number] = [-84.4, 33.7];
    const b: [number, number] = [-84.3, 33.8];
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
