import type { WaterClass, WaterDemandClass, WaterFeatureType } from "../../types/water";

// Qualitative water classing for candidate ranking — NOT a capacity claim.
// Mirrors lib/power/voltageClass.ts: coarse, estimated, load-aware plausibility.
// OSM has no reliable flow/seasonal tag, so this is honestly thinner than power.

// Quality order: major_river > reservoir > minor_stream. unknown = data gap.
const CLASS_ORDINAL: Record<Exclude<WaterClass, "unknown">, number> = {
  minor_stream: 1,
  reservoir: 2,
  major_river: 3,
};

export function classifyWater(waterType: WaterFeatureType): WaterClass {
  switch (waterType) {
    case "river":
      return "major_river";
    case "reservoir":
    case "lake":
    case "pond":
    case "water":
      return "reservoir"; // coarse: any standing water body → reservoir tier
    case "stream":
      return "minor_stream";
    default:
      return "unknown";
  }
}

// Minimum plausible water class for a qualitative DEMAND class (MW + cooling).
// Low/moderate demand: a minor stream is acceptable. High demand: a stream is
// likely insufficient, so a reservoir-or-better is the minimum. Coarse on purpose.
export function minPlausibleWaterClassForDemand(
  demand: WaterDemandClass,
): "minor_stream" | "reservoir" {
  return demand === "high" ? "reservoir" : "minor_stream";
}

export function isPlausibleWater(cls: WaterClass, demand: WaterDemandClass): boolean {
  if (cls === "unknown") return false;
  return CLASS_ORDINAL[cls] >= CLASS_ORDINAL[minPlausibleWaterClassForDemand(demand)];
}
