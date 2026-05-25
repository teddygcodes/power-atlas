export type SourceConfidence =
  | "official"
  | "community"
  | "derived"
  | "estimated"
  | "placeholder";

export type PowerFeatureType =
  | "substation"
  | "transmission_line"
  | "power_plant"
  | "generator"
  | "unknown_power";

export type CapacityStatus = "unknown" | "not_claimed";

export interface SourceMetadata {
  source: "osm" | "manual" | "derived";
  sourceUrl?: string;
  sourceConfidence: SourceConfidence;
  lastSyncedAt: string;
  bbox?: [number, number, number, number];
  osmId?: string;
  rawTags?: Record<string, string>;
}

export interface PowerFeatureProperties extends SourceMetadata {
  id: string;
  type: PowerFeatureType;
  name?: string;
  voltage?: string; // RAW OSM string, verbatim. Never parse to number.
  substationType?: string;
  capacityStatus: CapacityStatus; // hardcoded "unknown" everywhere in v0.1
}
