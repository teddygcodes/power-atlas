import type { CampusSizeMW } from "../../types/scenario";
import type { WaterClass } from "../../types/water";

// Honest, non-dramatic warnings for every water dependency. The
// proximity≠water-rights line is the non-negotiable headline of the layer.
export function buildWaterWarnings(params: {
  campusSizeMW: CampusSizeMW;
  waterClass: WaterClass;
  lowForLoad?: boolean;
}): string[] {
  const warnings: string[] = [
    "This is a candidate visible water dependency derived from public OSM data.",
    "Proximity does not imply water rights, withdrawal capacity, or legal access.",
    "Sustained availability and seasonal flow are not represented and require confirmation.",
  ];

  if (params.waterClass === "unknown") {
    warnings.push("OSM water type is unclear for this feature.");
  }
  if (params.lowForLoad) {
    warnings.push(
      "Nearest visible water source is a minor stream, likely insufficient for a load this size; a major water source would typically be required and must be confirmed.",
    );
    warnings.push(
      "Actual water demand depends on cooling design, which is not modeled in v0.2.",
    );
  }

  return warnings;
}
