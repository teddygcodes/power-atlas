import type { CampusSizeMW } from "../../types/scenario";
import type { LoadClass } from "../../types/dependency";

const LOAD_CLASS_BY_MW: Record<CampusSizeMW, LoadClass> = {
  50: "moderate",
  100: "large",
  250: "very_large",
  500: "extreme",
};

const LIKELY_REQUIREMENT_BY_MW: Record<CampusSizeMW, string> = {
  50: "Utility coordination and interconnection study likely.",
  100: "Dedicated utility planning and possible substation work likely.",
  250: "Major interconnection and grid upgrade likely.",
  500: "Hyperscale load; major transmission-level planning likely.",
};

export function getLoadClass(mw: CampusSizeMW): LoadClass {
  return LOAD_CLASS_BY_MW[mw];
}

export function getLikelyRequirement(mw: CampusSizeMW): string {
  return LIKELY_REQUIREMENT_BY_MW[mw];
}
