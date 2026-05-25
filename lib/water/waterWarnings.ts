import type { CoolingType } from "../../types/scenario";
import type { WaterClass, WaterDemandClass } from "../../types/water";

// Honest, non-dramatic warnings for every water dependency. The
// proximity≠water-rights line and the cooling-not-modeled caveat are the
// non-negotiable headlines — cooling sets a qualitative demand DIRECTION only,
// never a consumption magnitude.
export function buildWaterWarnings(params: {
  demandClass: WaterDemandClass;
  coolingType: CoolingType;
  waterClass: WaterClass;
  lowForLoad?: boolean;
}): string[] {
  const warnings: string[] = [
    "This is a candidate visible water dependency derived from public OSM data.",
    "Proximity does not imply water rights, withdrawal capacity, or legal access.",
    "Sustained availability and seasonal flow are not represented and require confirmation.",
    "Actual water consumption depends on climate, cooling design, and load factor — not modeled. Cooling type sets a qualitative demand class only.",
  ];

  if (params.waterClass === "unknown") {
    warnings.push("OSM water type is unclear for this feature.");
  }
  if (params.lowForLoad) {
    warnings.push(
      "Nearest visible water source is a minor stream, likely insufficient for this demand class; a major water source would typically be required and must be confirmed.",
    );
  }

  return warnings;
}
