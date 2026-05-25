import type { PowerFeature, PowerFeatureCollection } from "../../types/geojson";
import type { DataCenterScenario } from "../../types/scenario";
import type { CandidatePowerDependency } from "../../types/dependency";
import { getRepresentativeCoordinate } from "../geo/centroid";
import { haversineKm } from "../geo/distance";
import { nearestFeature } from "../geo/nearest";
import { getLoadClass, getLikelyRequirement } from "./loadClasses";
import { buildPowerWarnings } from "./powerWarnings";
import { classifyVoltage, isPlausible, type VoltageClass } from "./voltageClass";

export interface ResolveInput {
  scenario: DataCenterScenario;
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
}

interface RankedCandidate {
  feature: PowerFeature;
  coordinates: [number, number];
  distanceKm: number;
  voltageClass: VoltageClass;
  tier: number; // 0 plausible, 1 unknown (data gap), 2 low-for-load
}

// v0.1 resolution rule:
//   The candidate is a NEAREST SUBSTATION, but ranked by qualitative voltage
//   PLAUSIBILITY first, then distance. A large load realistically interconnects
//   at transmission voltage, so a closer low-voltage substation is preferred
//   below a plausible one — yet never hard-excluded. Voltage classing is a
//   derived/estimated heuristic; it NEVER implies capacity (still "unknown").
//   Only if there is NO substation at all do we fall back to the nearest
//   transmission line.
//
// Power plants / generators are CONTEXT ONLY and are never passed in here.
export function resolveCandidatePowerDependency(
  input: ResolveInput,
): CandidatePowerDependency | null {
  const { scenario, substations, transmissionLines } = input;
  const from = scenario.coordinates;
  const mw = scenario.campusSizeMW;
  const reasonCodes: string[] = [];

  // Rank substations: tier (plausible > unknown > low-for-load), then distance.
  const ranked: RankedCandidate[] = [];
  for (const feature of substations.features) {
    const coordinates = getRepresentativeCoordinate(feature);
    if (!coordinates) continue;
    const voltageClass = classifyVoltage(feature.properties.voltage);
    const tier =
      voltageClass === "unknown" ? 1 : isPlausible(voltageClass, mw) ? 0 : 2;
    ranked.push({
      feature,
      coordinates,
      distanceKm: haversineKm(from, coordinates),
      voltageClass,
      tier,
    });
  }
  ranked.sort((a, b) => a.tier - b.tier || a.distanceKm - b.distanceKm);

  let chosenFeature: PowerFeature;
  let coordinates: [number, number];
  let distanceKm: number;
  let voltageClass: VoltageClass;

  if (ranked.length > 0) {
    const top = ranked[0];
    chosenFeature = top.feature;
    coordinates = top.coordinates;
    distanceKm = top.distanceKm;
    voltageClass = top.voltageClass;
    reasonCodes.push("nearest_visible_substation");
  } else {
    // No substations — fall back to the nearest transmission line.
    const line = nearestFeature(from, transmissionLines.features);
    if (!line) return null;
    chosenFeature = line.feature;
    coordinates = line.coordinates;
    distanceKm = line.distanceKm;
    voltageClass = classifyVoltage(line.feature.properties.voltage);
    reasonCodes.push("nearest_visible_transmission_line");
  }

  const props = chosenFeature.properties;
  const voltage = props.voltage; // RAW string, never overwritten
  const lowForLoad = voltageClass !== "unknown" && !isPlausible(voltageClass, mw);

  reasonCodes.push(voltage ? "has_voltage_tag" : "missing_voltage_tag");
  if (props.substationType === "transmission") {
    reasonCodes.push("transmission_substation_tag_present");
  }
  // Qualitative, estimated voltage-class signal (not a capacity claim).
  if (voltageClass === "unknown") reasonCodes.push("voltage_class_unknown");
  else if (lowForLoad) reasonCodes.push("voltage_class_low_for_load");
  else reasonCodes.push("voltage_class_plausible");
  reasonCodes.push("capacity_unknown");
  reasonCodes.push("proximity_not_connectivity");

  return {
    featureId: props.id,
    featureType: props.type,
    name: props.name,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
    voltage,
    sourceConfidence: props.sourceConfidence,
    pathConfidence: "derived",
    capacityStatus: "unknown",
    loadClass: getLoadClass(mw),
    likelyRequirement: getLikelyRequirement(mw),
    warnings: buildPowerWarnings({
      campusSizeMW: mw,
      voltage,
      voltageClassLowForLoad: lowForLoad,
    }),
    reasonCodes,
    candidateCoordinates: coordinates,
  };
}
