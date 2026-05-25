import type {
  BuildPhase,
  CampusBuildFeature,
  PhaseReveal,
} from "../../types/timeline";

// Ordered build SEQUENCE (not a schedule). Index is an ordinal position only — it
// carries no time meaning (no months/weeks/days). Reveal is cumulative: a feature
// that appears at one phase stays visible through every later phase.
export const BUILD_PHASES = [
  "site_prep",
  "power_infrastructure",
  "water_cooling",
  "operational",
] as const;

// Ordinal rank for sequence comparisons. These are positions, NOT durations.
export const PHASE_ORDINAL: Record<BuildPhase, number> = {
  site_prep: 0,
  power_infrastructure: 1,
  water_cooling: 2,
  operational: 3,
};

// The phase at which each campus-build feature first appears. The site is staked at
// site_prep; the power interconnection at power_infrastructure; the water supply at
// water_cooling. By "operational" all are present — identical to the un-timelined view.
export const FEATURE_APPEARS_AT: Record<CampusBuildFeature, BuildPhase> = {
  campusSite: "site_prep",
  candidatePowerPath: "power_infrastructure",
  candidateWaterPath: "water_cooling",
};

// Pure display gate: given the current phase, which campus features are revealed.
// No resolver calls, no data imports, no dates — it only sequences ALREADY-resolved
// features. A feature is revealed once the phase has reached the phase it appears at.
export function revealForPhase(phase: BuildPhase): PhaseReveal {
  const current = PHASE_ORDINAL[phase];
  const reveal = {} as PhaseReveal;
  for (const feature of Object.keys(FEATURE_APPEARS_AT) as CampusBuildFeature[]) {
    reveal[feature] = PHASE_ORDINAL[FEATURE_APPEARS_AT[feature]] <= current;
  }
  return reveal;
}
