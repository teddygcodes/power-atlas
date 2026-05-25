// Construction timeline — a PRESENTATIONAL reveal of the campus build, not analysis.
// Phases are ORDINAL (a build SEQUENCE), never a schedule: no durations, dates, or
// month/week numbers exist anywhere in this layer. A phase just gates which campus
// assets are revealed on the map; nothing is recomputed.
export type BuildPhase =
  | "site_prep"
  | "power_infrastructure"
  | "water_cooling"
  | "operational";

// The campus's own build features that the timeline reveals in sequence. The
// surrounding world (substations, transmission, plants, water bodies, flood zones)
// is NOT a campus-build feature — it stays on its existing user toggles, unphased.
export type CampusBuildFeature =
  | "campusSite"
  | "candidatePowerPath"
  | "candidateWaterPath";

// Which campus features are revealed at a given phase (cumulative).
export type PhaseReveal = Record<CampusBuildFeature, boolean>;
