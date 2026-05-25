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
