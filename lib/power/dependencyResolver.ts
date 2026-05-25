import type { PowerFeatureCollection } from "../../types/geojson";
import type { DataCenterScenario } from "../../types/scenario";
import type { CandidatePowerDependency } from "../../types/dependency";
import { nearestFeature } from "../geo/nearest";
import { getLoadClass, getLikelyRequirement } from "./loadClasses";
import { buildPowerWarnings } from "./powerWarnings";

export interface ResolveInput {
  scenario: DataCenterScenario;
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
}

// v0.1 resolution rule (the one judgment call, made explicit):
//   The candidate is the NEAREST SUBSTATION, period.
//   Only if there is NO substation in the dataset do we fall back to the
//   nearest transmission line. This is not a fuzzy "plausibility" heuristic.
//
// Power plants / generators are CONTEXT ONLY and are never passed in here.
export function resolveCandidatePowerDependency(
  input: ResolveInput,
): CandidatePowerDependency | null {
  const { scenario, substations, transmissionLines } = input;
  const from = scenario.coordinates;
  const reasonCodes: string[] = [];

  let chosen = nearestFeature(from, substations.features);
  if (chosen) {
    reasonCodes.push("nearest_visible_substation");
  } else {
    chosen = nearestFeature(from, transmissionLines.features);
    if (chosen) reasonCodes.push("nearest_visible_transmission_line");
  }

  if (!chosen) return null;

  const props = chosen.feature.properties;
  const voltage = props.voltage;

  reasonCodes.push(voltage ? "has_voltage_tag" : "missing_voltage_tag");
  if (props.substationType === "transmission") {
    reasonCodes.push("transmission_substation_tag_present");
  }
  reasonCodes.push("capacity_unknown");
  reasonCodes.push("proximity_not_connectivity");

  return {
    featureId: props.id,
    featureType: props.type,
    name: props.name,
    distanceKm: Math.round(chosen.distanceKm * 1000) / 1000,
    voltage,
    sourceConfidence: props.sourceConfidence,
    pathConfidence: "derived",
    capacityStatus: "unknown",
    loadClass: getLoadClass(scenario.campusSizeMW),
    likelyRequirement: getLikelyRequirement(scenario.campusSizeMW),
    warnings: buildPowerWarnings({ campusSizeMW: scenario.campusSizeMW, voltage }),
    reasonCodes,
    candidateCoordinates: chosen.coordinates,
  };
}
