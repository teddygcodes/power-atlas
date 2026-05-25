import type {
  SourceMetadata,
  SourceConfidence,
  CapacityStatus,
} from "./infrastructure";

// OSM-derived water feature category (from tags).
export type WaterFeatureType =
  | "river"
  | "reservoir"
  | "lake"
  | "pond"
  | "stream"
  | "water"
  | "unknown_water";

// Coarse qualitative class for candidate ranking (mirrors power's voltage class).
// Quality order: major_river > reservoir > minor_stream. "unknown" is a data gap.
export type WaterClass = "major_river" | "reservoir" | "minor_stream" | "unknown";

// Qualitative water-demand class derived from (campus MW + cooling type). This
// is the resolver's demand signal — never a quantity. Order: low < moderate < high.
export type WaterDemandClass = "low" | "moderate" | "high";

export interface WaterFeatureProperties extends SourceMetadata {
  id: string;
  waterType: WaterFeatureType;
  name?: string;
  capacityStatus: CapacityStatus; // hardcoded "unknown" in v0.2
  // Representative coordinate from FULL-resolution geometry (see power props).
  repCoord?: [number, number];
}

// Mirrors CandidatePowerDependency. Capacity is never claimed; the path and the
// classing are derived/estimated; proximity never implies water rights.
export interface CandidateWaterDependency {
  featureId: string;
  waterType: WaterFeatureType;
  name?: string;
  distanceKm: number;
  waterClass: WaterClass;
  demandClass: WaterDemandClass; // qualitative demand (MW + cooling) — never a quantity
  sourceConfidence: SourceConfidence;
  pathConfidence: "derived";
  capacityStatus: "unknown";
  warnings: string[];
  reasonCodes: string[];
  candidateCoordinates: [number, number];
}
