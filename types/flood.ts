import type { SourceMetadata } from "./infrastructure";

// Raw FEMA flood-zone class (the NFHL FLD_ZONE attribute), e.g. "AE", "A",
// "AO", "AH", "VE", "X", "D". Kept as the verbatim FEMA string.
export type FloodZoneClass = string;

// Coarse, qualitative severity derived from the FEMA zone class — never a
// probability or elevation. unknown = undetermined / unmapped class.
export type FloodSeverity = "high" | "moderate" | "minimal" | "unknown";

// The campus's relationship to mapped flood zones.
export type FloodRelationship = "inside" | "near" | "none";

export interface FloodFeatureProperties extends SourceMetadata {
  id: string;
  zoneClass: FloodZoneClass;
  zoneSubtype?: string; // FEMA ZONE_SUBTY, verbatim when present
  cached: true; // statically cached FEMA NFHL, not live/authoritative
}

// Risk readout for a campus — deliberately NOT a Candidate*Dependency. Flood is
// a constraint the campus sits IN, not a resource it reaches OUT to: there is no
// path and no capacity concept, so this type omits both. Risk is qualitative and
// derived, never a determination.
export interface CampusFloodRisk {
  relationship: FloodRelationship;
  severity: FloodSeverity;
  zoneClass?: FloodZoneClass; // present when inside / near
  distanceKm?: number; // present when near
  riskStatus: "derived";
  warnings: string[];
  reasonCodes: string[];
}
