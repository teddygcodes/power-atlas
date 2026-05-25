import type { CampusSizeMW } from "../../types/scenario";

// Honest, non-dramatic warnings attached to every candidate dependency.
// Order: always-on base warnings first, then conditional ones.
export function buildPowerWarnings(params: {
  campusSizeMW: CampusSizeMW;
  voltage?: string;
}): string[] {
  const warnings: string[] = [
    "This is a candidate visible power dependency derived from public OSM data.",
    "Actual interconnection feasibility and capacity require utility confirmation.",
    "Nearest visible infrastructure may not be the correct grid interconnection point.",
  ];

  if (!params.voltage) {
    warnings.push("OSM voltage tag is missing for this feature.");
  }
  if (params.campusSizeMW >= 250) {
    warnings.push(
      "This is a very large load class; major utility planning would likely be required.",
    );
  }
  if (params.campusSizeMW === 500) {
    warnings.push(
      "500MW is a hyperscale load; public proximity alone is not meaningful evidence of feasibility.",
    );
  }

  return warnings;
}
