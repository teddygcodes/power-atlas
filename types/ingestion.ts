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
}
