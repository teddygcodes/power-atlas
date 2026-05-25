import type { SourceConfidence } from "./infrastructure";

export type LoadClass = "moderate" | "large" | "very_large" | "extreme";

export interface CandidatePowerDependency {
  featureId: string;
  featureType: string;
  name?: string;
  distanceKm: number;
  voltage?: string; // RAW OSM string, verbatim
  sourceConfidence: SourceConfidence;
  pathConfidence: "derived";
  capacityStatus: "unknown";
  loadClass: LoadClass;
  likelyRequirement: string;
  warnings: string[];
  reasonCodes: string[];
  candidateCoordinates: [number, number];
}
