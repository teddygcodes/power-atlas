import type { CampusSizeMW, CoolingType } from "../../types/scenario";
import type { WaterDemandClass } from "../../types/water";

// Cooling type refines campus water demand qualitatively. This is the ONLY place
// (MW + cooling) → demand class is decided. It is DIRECTION + CLASS only — never a
// quantity. Real consumption depends on climate, cooling cycles, and load factor
// the tool cannot know, so no gallons/day / MGD / % ever appears here.
//
// Coarse table (no pseudo-precise bands):
//                 air        hybrid      evaporative
//   50/100 MW     low        moderate    high
//   250/500 MW    moderate   high        high
//
// Default cooling is "hybrid" (see waterResolver), which reproduces the prior
// MW-only thresholds: small → minor_stream acceptable, large → reservoir needed.
export function waterDemandClass(
  mw: CampusSizeMW,
  coolingType: CoolingType,
): WaterDemandClass {
  const large = mw >= 250;
  switch (coolingType) {
    case "air":
      return large ? "moderate" : "low";
    case "evaporative":
      return "high";
    case "hybrid":
      return large ? "high" : "moderate";
  }
}

// Ordinal for "air < hybrid < evaporative" / demand comparisons in tests + UI.
export const DEMAND_ORDINAL: Record<WaterDemandClass, number> = {
  low: 1,
  moderate: 2,
  high: 3,
};
