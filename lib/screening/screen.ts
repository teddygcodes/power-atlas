import type {
  PowerFeatureCollection,
  WaterFeatureCollection,
  FloodFeatureCollection,
} from "../../types/geojson";
import type { CampusSizeMW, CoolingType } from "../../types/scenario";
import type { BboxSWNE, ScreeningCell, ScreeningResult } from "../../types/screening";
import { resolveCandidatePowerDependency } from "../power/dependencyResolver";
import { resolveCandidateWaterDependency } from "../water/waterResolver";
import { resolveCampusFloodRisk } from "../flood/floodResolver";
import { generateGrid } from "./grid";
import { classifyPower, classifyWater, classifyFlood } from "./classify";

// Region bbox (S,W,N,E) — mirrors public/geojson/georgia-demo/source-manifest.json.
// Kept as a constant (alongside the app's hardcoded REGION) so screening computes
// synchronously without an extra async manifest fetch.
export const SCREENING_BBOX: BboxSWNE = [33.4, -84.8, 34.3, -83.8];

// Coarse screening resolution. 0.125° (~64 cells over this bbox) keeps the synchronous
// recompute responsive (~0.6 s) on the full real dataset; the flood "near" scan over
// ~824 polygons is the cost driver, so density is the lever (tune DOWN first if slow).
export const SCREENING_SPACING_DEG = 0.125;

export const SCREENING_CAVEAT =
  "Screening reflects only publicly-visible infrastructure and mapped risk. It does NOT account for interconnection feasibility, available capacity, water rights, land availability, zoning, or current conditions. This narrows where to investigate — it is not a site recommendation. Verify everything externally.";

export interface ScreenRegionInput {
  campusSizeMW: CampusSizeMW;
  coolingType: CoolingType;
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
  water: WaterFeatureCollection;
  flood: FloodFeatureCollection;
  bbox?: BboxSWNE;
  spacingDeg?: number;
}

// Run the THREE EXISTING resolvers at each grid cell (treating the cell center as
// the campus coord, with the user's current MW + cooling), classify each output
// qualitatively, and AND-gate. Resolvers are called, never modified. There is no
// composite score — only three independent ratings + a boolean.
export function screenRegion(input: ScreenRegionInput): ScreeningResult {
  const bbox = input.bbox ?? SCREENING_BBOX;
  const spacingDeg = input.spacingDeg ?? SCREENING_SPACING_DEG;
  const grid = generateGrid(bbox, spacingDeg);

  const cells: ScreeningCell[] = grid.map(({ center, polygon }) => {
    const scenario = {
      campusSizeMW: input.campusSizeMW,
      coordinates: center,
      coolingType: input.coolingType,
    };
    const power = classifyPower(
      resolveCandidatePowerDependency({
        scenario,
        substations: input.substations,
        transmissionLines: input.transmissionLines,
      }),
    );
    const water = classifyWater(
      resolveCandidateWaterDependency({ scenario, waterFeatures: input.water }),
    );
    const flood = classifyFlood(
      resolveCampusFloodRisk({ scenario, floodZones: input.flood }),
    );
    const worthInvestigating =
      power.rating !== "unfavorable" &&
      water.rating !== "unfavorable" &&
      flood.rating !== "unfavorable";
    return { center, polygon, power, water, flood, worthInvestigating };
  });

  return { cells, bbox, spacingDeg, caveat: SCREENING_CAVEAT };
}
