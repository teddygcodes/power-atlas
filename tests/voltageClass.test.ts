import { describe, it, expect } from "vitest";
import {
  parseVoltageToVolts,
  classifyVoltage,
  minPlausibleClassForLoad,
  isPlausible,
} from "../lib/power/voltageClass";

describe("parseVoltageToVolts", () => {
  it("parses plain volt strings", () => {
    expect(parseVoltageToVolts("115000")).toBe(115000);
    expect(parseVoltageToVolts("230000")).toBe(230000);
  });

  it("parses kV-suffixed strings", () => {
    expect(parseVoltageToVolts("115kV")).toBe(115000);
    expect(parseVoltageToVolts(" 230 kV ")).toBe(230000);
  });

  it("takes the MAX token of semicolon multi-voltage", () => {
    expect(parseVoltageToVolts("115000;46000;12000")).toBe(115000);
    expect(parseVoltageToVolts("230000;12000")).toBe(230000);
  });

  it("returns null for missing or garbage", () => {
    expect(parseVoltageToVolts(undefined)).toBeNull();
    expect(parseVoltageToVolts("")).toBeNull();
    expect(parseVoltageToVolts("high")).toBeNull();
    expect(parseVoltageToVolts("AC")).toBeNull();
  });
});

describe("classifyVoltage", () => {
  it("classes real OSM voltage strings", () => {
    expect(classifyVoltage("115000")).toBe("sub_transmission");
    expect(classifyVoltage("230000")).toBe("transmission");
    expect(classifyVoltage("115kV")).toBe("sub_transmission");
    expect(classifyVoltage("115000;46000;12000")).toBe("sub_transmission"); // max 115000
    expect(classifyVoltage("230000;12000")).toBe("transmission"); // max 230000
    expect(classifyVoltage("12000")).toBe("distribution");
  });

  it("classes missing/garbage as unknown (never guesses)", () => {
    expect(classifyVoltage(undefined)).toBe("unknown");
    expect(classifyVoltage("nonsense")).toBe("unknown");
  });
});

describe("minPlausibleClassForLoad / isPlausible", () => {
  it("requires at least sub_transmission for 50/100 MW", () => {
    expect(minPlausibleClassForLoad(50)).toBe("sub_transmission");
    expect(minPlausibleClassForLoad(100)).toBe("sub_transmission");
    expect(isPlausible("sub_transmission", 100)).toBe(true);
    expect(isPlausible("transmission", 100)).toBe(true);
    expect(isPlausible("distribution", 100)).toBe(false);
  });

  it("requires transmission for 250/500 MW", () => {
    expect(minPlausibleClassForLoad(250)).toBe("transmission");
    expect(minPlausibleClassForLoad(500)).toBe("transmission");
    expect(isPlausible("transmission", 500)).toBe(true);
    expect(isPlausible("sub_transmission", 500)).toBe(false);
    expect(isPlausible("distribution", 500)).toBe(false);
  });

  it("treats unknown as not plausible (but caller handles it as a data gap)", () => {
    expect(isPlausible("unknown", 50)).toBe(false);
    expect(isPlausible("unknown", 500)).toBe(false);
  });
});
