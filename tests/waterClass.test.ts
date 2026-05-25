import { describe, it, expect } from "vitest";
import {
  classifyWater,
  minPlausibleWaterClassForLoad,
  isPlausibleWater,
} from "../lib/water/waterClass";

describe("classifyWater", () => {
  it("maps OSM water types to coarse classes", () => {
    expect(classifyWater("river")).toBe("major_river");
    expect(classifyWater("reservoir")).toBe("reservoir");
    expect(classifyWater("lake")).toBe("reservoir");
    expect(classifyWater("pond")).toBe("reservoir");
    expect(classifyWater("water")).toBe("reservoir");
    expect(classifyWater("stream")).toBe("minor_stream");
    expect(classifyWater("unknown_water")).toBe("unknown");
  });
});

describe("minPlausibleWaterClassForLoad / isPlausibleWater", () => {
  it("accepts a minor stream for small loads (50/100 MW)", () => {
    expect(minPlausibleWaterClassForLoad(50)).toBe("minor_stream");
    expect(minPlausibleWaterClassForLoad(100)).toBe("minor_stream");
    expect(isPlausibleWater("minor_stream", 100)).toBe(true);
    expect(isPlausibleWater("reservoir", 100)).toBe(true);
    expect(isPlausibleWater("major_river", 100)).toBe(true);
  });

  it("requires reservoir-or-better for large loads (stream insufficient)", () => {
    expect(minPlausibleWaterClassForLoad(250)).toBe("reservoir");
    expect(minPlausibleWaterClassForLoad(500)).toBe("reservoir");
    expect(isPlausibleWater("minor_stream", 500)).toBe(false);
    expect(isPlausibleWater("reservoir", 500)).toBe(true);
    expect(isPlausibleWater("major_river", 500)).toBe(true);
  });

  it("treats unknown as not plausible (data gap, ranked by the resolver)", () => {
    expect(isPlausibleWater("unknown", 50)).toBe(false);
    expect(isPlausibleWater("unknown", 500)).toBe(false);
  });
});
