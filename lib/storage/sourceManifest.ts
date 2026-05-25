import type { BboxSWNE, SourceManifest } from "../../types/ingestion";

// The three required honesty warnings, verbatim. Surfaced in the manifest and
// the Ingestion Center UI.
export const REQUIRED_INGESTION_WARNINGS = [
  "OSM power infrastructure is community-sourced and may be incomplete.",
  "Feature proximity does not imply grid connectivity.",
  "Capacity is unknown unless verified by utility or official study.",
] as const;

const DEFAULT_LIMITATIONS = [
  "Substation geometry is predominantly polygons; map markers use computed representative coordinates (centroids).",
  "Voltage values are raw OSM tag strings and may be missing, unit-inconsistent (e.g. 115000 vs 115kV), or multi-valued (semicolon-delimited).",
  "Power plants and generators are shown for context only and are not used in dependency resolution.",
  "Coverage is limited to the queried bounding box; infrastructure outside it is not represented.",
  "Geometry is simplified for rendering and is not survey-accurate; analysis uses the full-resolution representative coordinate.",
] as const;

export function buildSourceManifest(params: {
  region: string;
  bbox: BboxSWNE;
  lastSyncedAt: string;
  rawFeatureCount: number;
  substationCount: number;
  transmissionLineCount: number;
  powerPlantCount: number;
  generatorCount: number;
}): SourceManifest {
  return {
    region: params.region,
    bbox: params.bbox,
    source: "OSM Overpass",
    sourceUrl: "https://overpass-api.de/api/interpreter",
    lastSyncedAt: params.lastSyncedAt,
    rawFeatureCount: params.rawFeatureCount,
    substationCount: params.substationCount,
    transmissionLineCount: params.transmissionLineCount,
    powerPlantCount: params.powerPlantCount,
    generatorCount: params.generatorCount,
    warnings: [...REQUIRED_INGESTION_WARNINGS],
    limitations: [...DEFAULT_LIMITATIONS],
  };
}

// Water honesty warnings — proximity≠water-rights is the headline (v0.2).
export const REQUIRED_WATER_WARNINGS = [
  "Water proximity does not imply water rights, withdrawal capacity, or legal access.",
  "Sustained availability and seasonal flow are not represented and must be confirmed.",
  "OSM water data is community-sourced and may be incomplete.",
] as const;

const DEFAULT_WATER_LIMITATIONS = [
  "Only named water features are ingested; unnamed ponds and drainage ditches are excluded.",
  "Water type classing (major river / reservoir / minor stream) is coarse and estimated.",
  "Actual water demand depends on cooling design, which is not modeled in v0.2.",
  "Geometry is simplified for rendering and is not survey-accurate; analysis uses the full-resolution representative coordinate.",
] as const;

// Merge water fields into an existing manifest (idempotent — safe to re-run).
export function applyWaterToManifest(
  manifest: SourceManifest,
  waterFeatureCount: number,
): SourceManifest {
  return {
    ...manifest,
    waterFeatureCount,
    waterWarnings: [...REQUIRED_WATER_WARNINGS],
    waterLimitations: [...DEFAULT_WATER_LIMITATIONS],
  };
}

// Flood honesty warnings — the cached/not-authoritative + verify-with-MSC lines
// are mandatory; absence-isn't-proof guards the "no mapped zone" case.
export const REQUIRED_FLOOD_WARNINGS = [
  "Flood zones are statically cached FEMA NFHL data, not current or authoritative.",
  "Verify against the official FEMA Flood Map Service Center (msc.fema.gov) before any siting decision.",
  "Absence of a mapped flood zone is not proof of no risk; cached data may be incomplete.",
] as const;

const DEFAULT_FLOOD_LIMITATIONS = [
  "Flood coverage is a focused sub-area (Atlanta corridor) of the region bbox, not the full region.",
  "Only Special Flood Hazard Area (high-risk) zones are loaded; minimal-risk X areas are excluded, so points outside an SFHA resolve as 'no mapped flood zone'.",
  "Zone severity is qualitative, from the FEMA zone class only — no probabilities or base-flood elevations.",
  "Flood is a site-risk constraint; it is not combined with power / water / cooling in v0.4.",
] as const;

// Merge flood fields. floodZoneCount 0 → honest-empty (no flood data loaded).
export function applyFloodToManifest(
  manifest: SourceManifest,
  floodZoneCount: number,
): SourceManifest {
  return {
    ...manifest,
    floodZoneCount,
    floodWarnings: [...REQUIRED_FLOOD_WARNINGS],
    floodLimitations:
      floodZoneCount > 0
        ? [...DEFAULT_FLOOD_LIMITATIONS]
        : ["No flood data loaded for this region (honest-empty); the flood layer renders nothing."],
  };
}
