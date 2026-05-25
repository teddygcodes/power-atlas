import { describe, it, expect } from "vitest";
import {
  classifyWater,
  minPlausibleWaterClassForDemand,
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

describe("minPlausibleWaterClassForDemand / isPlausibleWater", () => {
  it("accepts a minor stream for low/moderate demand", () => {
    expect(minPlausibleWaterClassForDemand("low")).toBe("minor_stream");
    expect(minPlausibleWaterClassForDemand("moderate")).toBe("minor_stream");
    expect(isPlausibleWater("minor_stream", "moderate")).toBe(true);
    expect(isPlausibleWater("reservoir", "moderate")).toBe(true);
    expect(isPlausibleWater("major_river", "moderate")).toBe(true);
  });

  it("requires reservoir-or-better for high demand (stream insufficient)", () => {
    expect(minPlausibleWaterClassForDemand("high")).toBe("reservoir");
    expect(isPlausibleWater("minor_stream", "high")).toBe(false);
    expect(isPlausibleWater("reservoir", "high")).toBe(true);
    expect(isPlausibleWater("major_river", "high")).toBe(true);
  });

  it("treats unknown as not plausible (data gap, ranked by the resolver)", () => {
    expect(isPlausibleWater("unknown", "low")).toBe(false);
    expect(isPlausibleWater("unknown", "high")).toBe(false);
  });
});
