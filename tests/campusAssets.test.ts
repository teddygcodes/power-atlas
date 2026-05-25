import { describe, it, expect } from "vitest";
import { CAMPUS_ASSETS, assetsForPhase } from "../lib/campus/assets";
import { BUILD_PHASES } from "../lib/timeline/phases";
import type { CampusAssetId } from "../types/campus";

const idsAt = (phase: Parameters<typeof assetsForPhase>[0]): CampusAssetId[] =>
  assetsForPhase(phase)
    .map((a) => a.id)
    .sort();

describe("assetsForPhase (cumulative campus reveal — reuses timeline ordinal)", () => {
  it("site_prep shows only the pad + roads", () => {
    expect(idsAt("site_prep")).toEqual(["roads", "site_pad"]);
  });

  it("power_infrastructure adds the electrical yard assets", () => {
    expect(idsAt("power_infrastructure")).toEqual(
      ["bess", "generators", "roads", "site_pad", "substation_yard", "transformers"].sort(),
    );
  });

  it("water_cooling adds the cooling plant + water tanks", () => {
    expect(idsAt("water_cooling")).toContain("cooling_plant");
    expect(idsAt("water_cooling")).toContain("water_tanks");
    expect(idsAt("water_cooling")).not.toContain("data_halls");
  });

  it("operational reveals EVERY asset (additive — full set, not subtractive)", () => {
    expect(assetsForPhase("operational").length).toBe(CAMPUS_ASSETS.length);
    const all = CAMPUS_ASSETS.map((a) => a.id).sort();
    expect(idsAt("operational")).toEqual(all);
    expect(idsAt("operational")).toContain("data_halls");
  });

  it("reveal is monotonic: each later phase is a superset of the previous (never hides)", () => {
    for (let i = 1; i < BUILD_PHASES.length; i++) {
      const prev = new Set(idsAt(BUILD_PHASES[i - 1]));
      const curr = new Set(idsAt(BUILD_PHASES[i]));
      for (const id of prev) expect(curr.has(id)).toBe(true);
    }
  });

  it("site_prep shows the fewest assets, operational the most", () => {
    expect(assetsForPhase("site_prep").length).toBeLessThan(
      assetsForPhase("operational").length,
    );
  });
});

describe("campus assets — schematic only, NO fabricated specs", () => {
  it("asset ids + labels carry no spec/number (kV / MWh / MW / gallons / dimensions)", () => {
    const surface = CAMPUS_ASSETS.map((a) => `${a.id} ${a.label}`).join(" | ");
    expect(surface).not.toMatch(
      /\bkv\b|mwh?|\bmw\b|volt|gallon|mgd|meter|metre|\bft\b|dimension|\d+\s*(kv|mw|mwh|v|m|ft)/i,
    );
  });

  it("labels are plain human asset types (no digits at all)", () => {
    for (const a of CAMPUS_ASSETS) {
      expect(a.label).not.toMatch(/\d/);
    }
  });

  it("every asset uses a schematic primitive shape", () => {
    for (const a of CAMPUS_ASSETS) {
      expect(["box", "cylinder", "plane"]).toContain(a.shape);
    }
  });
});
