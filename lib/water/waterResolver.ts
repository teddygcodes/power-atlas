import type { WaterFeature, WaterFeatureCollection } from "../../types/geojson";
import type { DataCenterScenario } from "../../types/scenario";
import type { CandidateWaterDependency, WaterClass } from "../../types/water";
import { representativeCoordinate } from "../geo/centroid";
import { haversineKm } from "../geo/distance";
import { classifyWater, isPlausibleWater } from "./waterClass";
import { waterDemandClass } from "../cooling/waterDemand";
import { buildWaterWarnings } from "./waterWarnings";

export interface ResolveWaterInput {
  scenario: DataCenterScenario;
  waterFeatures: WaterFeatureCollection;
}

interface RankedWater {
  feature: WaterFeature;
  coordinates: [number, number];
  distanceKm: number;
  waterClass: WaterClass;
  tier: number; // 0 plausible, 1 unknown (data gap), 2 low-for-load
}

// Structural mirror of resolveCandidatePowerDependency: rank candidates by
// load-aware plausibility tier THEN distance; never exclude; capacity always
// "unknown"; path "derived". Water proximity is weaker evidence than power's —
// it says nothing about water rights, so that warning is always attached.
export function resolveCandidateWaterDependency(
  input: ResolveWaterInput,
): CandidateWaterDependency | null {
  const { scenario, waterFeatures } = input;
  const from = scenario.coordinates;
  // Demand input = MW + cooling (default hybrid reproduces the prior MW-only
  // behavior). This is the ONLY change vs the pre-cooling resolver — the ranking,
  // tiers, lowForLoad, and return shape below are unchanged.
  const coolingType = scenario.coolingType ?? "hybrid";
  const demandClass = waterDemandClass(scenario.campusSizeMW, coolingType);

  const ranked: RankedWater[] = [];
  for (const feature of waterFeatures.features) {
    const coordinates = representativeCoordinate(feature);
    if (!coordinates) continue;
    const waterClass = classifyWater(feature.properties.waterType);
    const tier =
      waterClass === "unknown" ? 1 : isPlausibleWater(waterClass, demandClass) ? 0 : 2;
    ranked.push({
      feature,
      coordinates,
      distanceKm: haversineKm(from, coordinates),
      waterClass,
      tier,
    });
  }
  ranked.sort((a, b) => a.tier - b.tier || a.distanceKm - b.distanceKm);

  if (ranked.length === 0) return null;

  const top = ranked[0];
  const props = top.feature.properties;
  const lowForLoad =
    top.waterClass !== "unknown" && !isPlausibleWater(top.waterClass, demandClass);

  const reasonCodes: string[] = [
    "nearest_visible_water_source",
    `water_type_${top.waterClass}`,
    `water_demand_${demandClass}`,
    `cooling_${coolingType}`,
    "proximity_not_water_rights",
    "capacity_unknown",
  ];

  return {
    featureId: props.id,
    waterType: props.waterType,
    name: props.name,
    distanceKm: Math.round(top.distanceKm * 1000) / 1000,
    waterClass: top.waterClass,
    demandClass,
    sourceConfidence: props.sourceConfidence,
    pathConfidence: "derived",
    capacityStatus: "unknown",
    warnings: buildWaterWarnings({
      demandClass,
      coolingType,
      waterClass: top.waterClass,
      lowForLoad,
    }),
    reasonCodes,
    candidateCoordinates: top.coordinates,
  };
}
