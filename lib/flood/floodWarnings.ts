import type { FloodRelationship, FloodZoneClass } from "../../types/flood";

// The cached / not-authoritative + verify-with-MSC line is mandatory on every
// flood result — flood-on-a-map reads as official, so this is non-negotiable.
const CACHED_CAVEAT =
  "Flood zones are statically cached FEMA NFHL data, not current or authoritative. Verify against the official FEMA Flood Map Service Center (msc.fema.gov) before any siting decision.";

export function buildFloodWarnings(params: {
  relationship: FloodRelationship;
  zoneClass?: FloodZoneClass;
}): string[] {
  const warnings = [CACHED_CAVEAT];

  if (params.relationship === "inside") {
    warnings.push(
      `The campus coordinate falls inside a mapped FEMA ${params.zoneClass} zone (a Special Flood Hazard Area). This is a candidate risk flag from cached data, not a determination.`,
    );
  } else if (params.relationship === "near") {
    warnings.push(
      `The campus is near a mapped FEMA ${params.zoneClass} zone — proximity to a mapped hazard, not a determination.`,
    );
  } else {
    warnings.push(
      "No mapped flood zone at or near this point. Absence of a mapped zone is NOT proof of no risk — this cached extract includes only high-risk (SFHA) zones and may be incomplete.",
    );
  }

  return warnings;
}
