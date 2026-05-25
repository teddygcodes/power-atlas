import type { CandidatePowerDependency } from "../../types/dependency";
import type { CandidateWaterDependency } from "../../types/water";
import type { CampusFloodRisk } from "../../types/flood";

// Explainability surfacing — turns EXISTING resolver output into a display model.
// HARD LINE: this module never recomputes, re-ranks, or invents a claim. It does
// NOT re-call voltageClass / waterDemandClass / floodSeverity — every value here
// already exists on the passed-in output object. Reason-code labels are faithful
// human restatements of the codes the resolvers already emit; raw tags are the
// verbatim stored OSM/FEMA tags looked up by id. Nothing new is derived.

export type PostureTone =
  | "neutral"
  | "community"
  | "derived"
  | "unknown"
  | "info"
  | "caution";

export interface PostureBadge {
  label: string;
  tone: PostureTone;
}
export interface ExplainRow {
  label: string;
  value: string;
  mono?: boolean;
}
export interface ExplainReasonCode {
  code: string; // the raw reason-code literal (shown for transparency)
  label: string; // human-readable restatement
}
export interface ExplainModel {
  title: string;
  posture: PostureBadge[];
  rows: ExplainRow[];
  reasonCodes: ExplainReasonCode[];
  rawTags?: Record<string, string>;
  caveats: string[];
  // Static honesty framing — what this output explicitly does NOT assert, and what
  // a real decision still requires. Constant copy per layer, never computed.
  notClaimed: string[];
  verificationNeeded: string[];
}

const POWER_NOT_CLAIMED = [
  "Not official grid connectivity",
  "Not available capacity",
  "Not utility approval",
  "Not an engineering study",
];
const POWER_VERIFICATION = [
  "Utility interconnection study",
  "Actual voltage / capacity confirmation",
  "Site-specific engineering review",
];
const WATER_NOT_CLAIMED = [
  "Not water rights or withdrawal capacity",
  "Not regulatory or utility approval",
  "Not an engineering study",
];
const WATER_VERIFICATION = [
  "Water-rights / withdrawal permitting review",
  "Sustained-availability and seasonal-flow confirmation",
  "Site-specific engineering review",
];
const FLOOD_NOT_CLAIMED = [
  "Not a current or authoritative FEMA determination",
  "Not a base-flood elevation",
  "Not a guarantee of safety (absence of a mapped zone is not proof of no risk)",
];
const FLOOD_VERIFICATION = [
  "Official FEMA Flood Map Service Center lookup (msc.fema.gov)",
  "Site survey / elevation certificate",
  "Site-specific engineering review",
];

// Faithful restatements of the EXACT reason-code literals the resolvers emit.
// These rephrase the existing code; they add no new semantics or claims.
const REASON_CODE_LABEL: Record<string, string> = {
  // power
  nearest_visible_substation: "Nearest visible substation",
  nearest_visible_transmission_line: "Nearest visible transmission line",
  has_voltage_tag: "Has an OSM voltage tag",
  missing_voltage_tag: "OSM voltage tag missing",
  transmission_substation_tag_present: "Tagged as a transmission substation",
  voltage_class_plausible: "Voltage class looks plausible for this load",
  voltage_class_low_for_load: "Voltage class appears low for this load",
  voltage_class_unknown: "Voltage class unknown",
  capacity_unknown: "Capacity unknown — never claimed",
  proximity_not_connectivity: "Proximity is not connectivity",
  // water
  nearest_visible_water_source: "Nearest visible water source",
  water_type_major_river: "Water type: major river",
  water_type_reservoir: "Water type: reservoir / lake",
  water_type_minor_stream: "Water type: minor stream",
  water_type_unknown: "Water type: unknown",
  water_demand_low: "Demand class: low",
  water_demand_moderate: "Demand class: moderate",
  water_demand_high: "Demand class: high",
  cooling_air: "Cooling: air",
  cooling_hybrid: "Cooling: hybrid",
  cooling_evaporative: "Cooling: evaporative",
  proximity_not_water_rights: "Proximity is not water rights",
  // flood
  campus_inside_mapped_flood_zone: "Campus is inside a mapped flood zone",
  campus_near_mapped_flood_zone: "Campus is near a mapped flood zone",
  no_mapped_flood_zone_nearby: "No mapped flood zone nearby",
  statically_cached_fema: "Statically cached FEMA data",
  absence_not_proof_of_no_risk: "Absence of a mapped zone is not proof of no risk",
};

// Human-readable label for a reason code. Exact match first; the open-ended
// `flood_zone_<CLASS>` family is restated as "FEMA zone: <CLASS>"; anything else
// falls back to today's underscore-replace pattern. No new claims are introduced.
export function reasonCodeLabel(code: string): string {
  if (code in REASON_CODE_LABEL) return REASON_CODE_LABEL[code];
  if (code.startsWith("flood_zone_")) {
    return `FEMA zone: ${code.slice("flood_zone_".length)}`;
  }
  return code.replace(/_/g, " ");
}

function reasonCodes(codes: string[]): ExplainReasonCode[] {
  return codes.map((code) => ({ code, label: reasonCodeLabel(code) }));
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Verbatim raw-tag lookup. Returns the stored OSM/FEMA tags for a feature id, or
// undefined — it NEVER synthesizes tags. Generic over any collection whose feature
// properties carry an `id` and optional `rawTags`.
export function findFeatureRawTags(
  collection: { features: { properties: { id: string; rawTags?: Record<string, string> } }[] } | undefined,
  featureId: string,
): Record<string, string> | undefined {
  if (!collection) return undefined;
  const match = collection.features.find((f) => f.properties.id === featureId);
  return match?.properties.rawTags;
}

export function explainPower(
  dep: CandidatePowerDependency,
  rawTags?: Record<string, string>,
): ExplainModel {
  return {
    title: "Candidate Power Dependency",
    posture: [
      { label: "Candidate", tone: "info" },
      { label: `Source: ${dep.sourceConfidence}`, tone: "community" },
      { label: `Path: ${dep.pathConfidence}`, tone: "derived" },
      { label: `Capacity: ${dep.capacityStatus}`, tone: "unknown" },
      { label: "Verify externally", tone: "caution" },
    ],
    rows: [
      { label: "Candidate", value: dep.name ?? dep.featureId, mono: !dep.name },
      { label: "Feature type", value: titleCase(dep.featureType) },
      { label: "Distance", value: `${dep.distanceKm.toFixed(2)} km` },
      { label: "Voltage tag (raw)", value: dep.voltage ?? "— missing —", mono: true },
      { label: "Load class", value: titleCase(dep.loadClass) },
      { label: "Likely requirement", value: dep.likelyRequirement },
    ],
    reasonCodes: reasonCodes(dep.reasonCodes),
    rawTags,
    caveats: dep.warnings,
    notClaimed: POWER_NOT_CLAIMED,
    verificationNeeded: POWER_VERIFICATION,
  };
}

export function explainWater(
  dep: CandidateWaterDependency,
  rawTags?: Record<string, string>,
): ExplainModel {
  return {
    title: "Candidate Water Dependency",
    posture: [
      { label: "Candidate", tone: "info" },
      { label: `Source: ${dep.sourceConfidence}`, tone: "community" },
      { label: `Path: ${dep.pathConfidence}`, tone: "derived" },
      { label: `Capacity: ${dep.capacityStatus}`, tone: "unknown" },
      { label: "Verify externally", tone: "caution" },
    ],
    rows: [
      { label: "Candidate source", value: dep.name ?? dep.featureId, mono: !dep.name },
      { label: "Water type", value: titleCase(dep.waterType) },
      { label: "Water class", value: titleCase(dep.waterClass) },
      { label: "Demand class", value: titleCase(dep.demandClass) },
      { label: "Distance", value: `${dep.distanceKm.toFixed(2)} km` },
    ],
    reasonCodes: reasonCodes(dep.reasonCodes),
    rawTags,
    caveats: dep.warnings,
    notClaimed: WATER_NOT_CLAIMED,
    verificationNeeded: WATER_VERIFICATION,
  };
}

const FLOOD_RELATIONSHIP: Record<CampusFloodRisk["relationship"], string> = {
  inside: "Inside a mapped zone",
  near: "Near a mapped zone",
  none: "No mapped zone nearby",
};
const FLOOD_SEVERITY: Record<CampusFloodRisk["severity"], string> = {
  high: "High",
  moderate: "Moderate",
  minimal: "Minimal",
  unknown: "Unknown",
};

export function explainFlood(risk: CampusFloodRisk): ExplainModel {
  const rows: ExplainRow[] = [
    { label: "Relationship", value: FLOOD_RELATIONSHIP[risk.relationship] },
    { label: "Severity", value: FLOOD_SEVERITY[risk.severity] },
  ];
  if (risk.zoneClass) rows.push({ label: "FEMA zone", value: risk.zoneClass, mono: true });
  if (risk.distanceKm != null) {
    rows.push({ label: "Distance to zone", value: `${risk.distanceKm.toFixed(2)} km` });
  }
  return {
    title: "Flood Site-Risk",
    posture: [
      { label: "Candidate", tone: "info" },
      { label: `Risk: ${risk.riskStatus}`, tone: "caution" },
      { label: "Source: FEMA (cached)", tone: "community" },
      { label: "Verify externally", tone: "caution" },
    ],
    rows,
    reasonCodes: reasonCodes(risk.reasonCodes),
    // Flood output carries no featureId → no rawTags surfaced (by design).
    caveats: risk.warnings,
    notClaimed: FLOOD_NOT_CLAIMED,
    verificationNeeded: FLOOD_VERIFICATION,
  };
}
