import type { FloodFeatureCollection } from "../../types/geojson";
import type { DataCenterScenario } from "../../types/scenario";
import type {
  CampusFloodRisk,
  FloodSeverity,
  FloodZoneClass,
} from "../../types/flood";
import { pointInPolygon, nearestVertexDistanceKm } from "../geo/pointInPolygon";
import { buildFloodWarnings } from "./floodWarnings";

// "Near" a mapped zone within this qualitative threshold → moderate concern.
const NEAR_THRESHOLD_KM = 1;

const HIGH_RISK = new Set(["A", "AE", "AO", "AH", "AR", "A99", "V", "VE"]);

// Qualitative severity from the FEMA zone class — never a probability/elevation.
export function floodSeverity(zoneClass: FloodZoneClass): FloodSeverity {
  const z = zoneClass.toUpperCase();
  if (HIGH_RISK.has(z)) return "high";
  if (z === "X") return "minimal";
  return "unknown";
}

const SEVERITY_RANK: Record<FloodSeverity, number> = {
  unknown: 0,
  minimal: 1,
  moderate: 2,
  high: 3,
};

export interface ResolveFloodInput {
  scenario: DataCenterScenario;
  floodZones: FloodFeatureCollection;
}

// RISK shape — NOT a nearest-source dependency. The campus sits IN / NEAR a zone
// (point-in / near polygon); there is no path and no capacity. riskStatus is
// qualitative/derived, never a determination.
export function resolveCampusFloodRisk(input: ResolveFloodInput): CampusFloodRisk {
  const { scenario, floodZones } = input;
  const pt = scenario.coordinates;

  // INSIDE: pick the worst-severity containing zone.
  const containing = floodZones.features.filter((f) => pointInPolygon(pt, f.geometry));
  if (containing.length > 0) {
    let worst = containing[0];
    let worstSeverity = floodSeverity(worst.properties.zoneClass);
    for (const f of containing) {
      const s = floodSeverity(f.properties.zoneClass);
      if (SEVERITY_RANK[s] > SEVERITY_RANK[worstSeverity]) {
        worst = f;
        worstSeverity = s;
      }
    }
    const zoneClass = worst.properties.zoneClass;
    return {
      relationship: "inside",
      severity: worstSeverity,
      zoneClass,
      riskStatus: "derived",
      warnings: buildFloodWarnings({ relationship: "inside", zoneClass }),
      reasonCodes: [
        "campus_inside_mapped_flood_zone",
        `flood_zone_${zoneClass}`,
        "statically_cached_fema",
      ],
    };
  }

  // NEAR: nearest zone within the threshold (nearest-vertex distance).
  let nearest = null as (typeof floodZones.features)[number] | null;
  let nearestKm = Infinity;
  for (const f of floodZones.features) {
    const d = nearestVertexDistanceKm(pt, f.geometry);
    if (d != null && d < nearestKm) {
      nearestKm = d;
      nearest = f;
    }
  }
  if (nearest && nearestKm <= NEAR_THRESHOLD_KM) {
    const zoneClass = nearest.properties.zoneClass;
    return {
      relationship: "near",
      severity: floodSeverity(zoneClass),
      zoneClass,
      distanceKm: Math.round(nearestKm * 1000) / 1000,
      riskStatus: "derived",
      warnings: buildFloodWarnings({ relationship: "near", zoneClass }),
      reasonCodes: [
        "campus_near_mapped_flood_zone",
        `flood_zone_${zoneClass}`,
        "statically_cached_fema",
      ],
    };
  }

  // NONE: no mapped zone at/near — and absence is not proof of no risk.
  return {
    relationship: "none",
    severity: "unknown",
    riskStatus: "derived",
    warnings: buildFloodWarnings({ relationship: "none" }),
    reasonCodes: [
      "no_mapped_flood_zone_nearby",
      "statically_cached_fema",
      "absence_not_proof_of_no_risk",
    ],
  };
}
