import { describe, it, expect } from "vitest";
import {
  BUILD_PHASES,
  PHASE_ORDINAL,
  FEATURE_APPEARS_AT,
  revealForPhase,
} from "../lib/timeline/phases";
import type { CampusBuildFeature } from "../types/timeline";

const ALL_FEATURES = Object.keys(FEATURE_APPEARS_AT) as CampusBuildFeature[];

describe("revealForPhase (ordinal display gate — cumulative)", () => {
  it("site_prep reveals the least: only the campus site", () => {
    expect(revealForPhase("site_prep")).toEqual({
      campusSite: true,
      candidatePowerPath: false,
      candidateWaterPath: false,
    });
  });

  it("power_infrastructure adds the candidate power path", () => {
    expect(revealForPhase("power_infrastructure")).toEqual({
      campusSite: true,
      candidatePowerPath: true,
      candidateWaterPath: false,
    });
  });

  it("water_cooling adds the candidate water path", () => {
    expect(revealForPhase("water_cooling")).toEqual({
      campusSite: true,
      candidatePowerPath: true,
      candidateWaterPath: true,
    });
  });

  it("operational reveals EVERY campus feature (timeline is additive, not subtractive)", () => {
    const reveal = revealForPhase("operational");
    for (const feature of ALL_FEATURES) {
      expect(reveal[feature]).toBe(true);
    }
  });

  it("reveal is monotonic: each later phase reveals a superset of the previous (never hides)", () => {
    for (let i = 1; i < BUILD_PHASES.length; i++) {
      const prev = revealForPhase(BUILD_PHASES[i - 1]);
      const curr = revealForPhase(BUILD_PHASES[i]);
      for (const feature of ALL_FEATURES) {
        // Anything revealed earlier stays revealed — scrubbing forward only adds.
        if (prev[feature]) expect(curr[feature]).toBe(true);
      }
    }
  });
});

describe("timeline honesty — ORDINAL only, never a schedule", () => {
  it("emits NO duration/date/schedule value anywhere in the phase model or its output", () => {
    const surface = JSON.stringify({
      phases: BUILD_PHASES,
      ordinals: PHASE_ORDINAL,
      appearsAt: FEATURE_APPEARS_AT,
      reveals: BUILD_PHASES.map((p) => revealForPhase(p)),
    });
    expect(surface).not.toMatch(
      /month|week|\bday\b|\bhour\b|year|schedule|duration|gantt|calendar|\bdate\b/i,
    );
  });

  it("phase ordinals are dense positions (0..n-1), not time quantities", () => {
    const ranks = BUILD_PHASES.map((p) => PHASE_ORDINAL[p]);
    expect(ranks).toEqual([0, 1, 2, 3]);
    expect(BUILD_PHASES.length).toBe(4);
  });

  it("revealForPhase returns booleans only — no numbers leak into the reveal", () => {
    for (const phase of BUILD_PHASES) {
      for (const value of Object.values(revealForPhase(phase))) {
        expect(typeof value).toBe("boolean");
      }
    }
  });
});
