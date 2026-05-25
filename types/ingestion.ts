// Bounding box ordered [south, west, north, east] (Overpass convention).
export type BboxSWNE = [number, number, number, number];

export interface SourceManifest {
  region: string;
  bbox: BboxSWNE;
  source: string; // e.g. "OSM Overpass"
  sourceUrl: string;
  lastSyncedAt: string;
  rawFeatureCount: number;
  substationCount: number;
  transmissionLineCount: number;
  powerPlantCount: number;
  generatorCount: number;
  warnings: string[];
  limitations: string[];
  // Water layer (v0.2) — added by the water ingest, merged into the manifest.
  waterFeatureCount?: number;
  waterWarnings?: string[];
  waterLimitations?: string[];
  // Flood layer (v0.4) — FEMA NFHL, merged by the flood ingest. floodZoneCount 0
  // means an honest-empty layer ("no flood data loaded").
  floodZoneCount?: number;
  floodWarnings?: string[];
  floodLimitations?: string[];
}
