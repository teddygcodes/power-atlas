import type { CampusSizeMW } from "../../types/scenario";
import type { WaterClass, WaterFeatureType } from "../../types/water";

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

// Minimum plausible water class for a load — qualitative, load-aware (mirrors
// power). Small loads: a minor stream is acceptable. Large loads: a stream is
// likely insufficient, so a reservoir-or-better is the minimum.
export function minPlausibleWaterClassForLoad(
  mw: CampusSizeMW,
): "minor_stream" | "reservoir" {
  return mw >= 250 ? "reservoir" : "minor_stream";
}

export function isPlausibleWater(cls: WaterClass, mw: CampusSizeMW): boolean {
  if (cls === "unknown") return false;
  return CLASS_ORDINAL[cls] >= CLASS_ORDINAL[minPlausibleWaterClassForLoad(mw)];
}
