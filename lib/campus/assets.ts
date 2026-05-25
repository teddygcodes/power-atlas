import type { BuildPhase } from "../../types/timeline";
import type { CampusAssetSpec } from "../../types/campus";
import { PHASE_ORDINAL } from "../timeline/phases";

// Declarative schematic campus massing. Sizes/positions are ARBITRARY SCENE UNITS
// chosen for legibility (a data hall reads bigger than a transformer) — they are
// NOT real dimensions, layout, or engineering. Labels are plain asset types; no
// per-asset specs (kV / MWh / gallons / dimensions) appear anywhere.
//
// `phase` reuses the v0.5 build-phase ordinal so the campus visibly assembles as the
// construction-timeline scrubber advances. Reveal is cumulative.
export const CAMPUS_ASSETS: CampusAssetSpec[] = [
  // — site_prep: the ground is staked and access laid in —
  {
    id: "site_pad",
    label: "Site Pad",
    phase: "site_prep",
    shape: "plane",
    size: [22, 0, 22],
    positions: [[0, 0]],
    color: "#1b2430",
  },
  {
    id: "roads",
    label: "Roads / Site Access",
    phase: "site_prep",
    shape: "box",
    size: [2.4, 0.06, 20],
    positions: [
      [-8, 0],
      [8, 0],
    ],
    color: "#2b3543",
  },

  // — power_infrastructure: the electrical yard goes in —
  {
    id: "substation_yard",
    label: "Substation Yard",
    phase: "power_infrastructure",
    shape: "box",
    size: [5, 0.4, 5],
    positions: [[6, -6]],
    color: "#3a4b59",
  },
  {
    id: "transformers",
    label: "Transformers",
    phase: "power_infrastructure",
    shape: "cylinder",
    size: [0.55, 1.3, 0],
    positions: [
      [5, -7],
      [6, -7],
      [7, -7],
    ],
    color: "#5ec8d8",
  },
  {
    id: "generators",
    label: "Backup Generators",
    phase: "power_infrastructure",
    shape: "box",
    size: [1.3, 1, 2],
    positions: [
      [8.2, -4.8],
      [8.2, -2.6],
    ],
    color: "#e0a458",
  },
  {
    id: "bess",
    label: "BESS (Battery Enclosures)",
    phase: "power_infrastructure",
    shape: "box",
    size: [1.6, 1, 0.9],
    positions: [
      [4.8, -4],
      [6.8, -4],
    ],
    color: "#9b8cce",
  },

  // — water_cooling: cooling + water support —
  {
    id: "cooling_plant",
    label: "Cooling Plant",
    phase: "water_cooling",
    shape: "box",
    size: [4, 2, 3],
    positions: [[-6, -5]],
    color: "#4aa3e0",
  },
  {
    id: "water_tanks",
    label: "Water Tanks",
    phase: "water_cooling",
    shape: "cylinder",
    size: [1.2, 2.6, 0],
    positions: [
      [-7.5, 2],
      [-4.3, 2],
    ],
    color: "#7fd2ff",
  },

  // — operational: the data halls come online —
  {
    id: "data_halls",
    label: "Data Halls",
    phase: "operational",
    shape: "box",
    size: [5, 3, 8],
    positions: [
      [-2.2, 4.5],
      [3.4, 4.5],
    ],
    color: "#c8d2dc",
  },
];

// Pure display gate: which assets are present at a given build phase (cumulative).
// Reuses the v0.5 PHASE_ORDINAL — no timeline logic is rebuilt here, and no resolver
// is called. An asset is shown once the phase reaches the phase it appears at.
export function assetsForPhase(phase: BuildPhase): CampusAssetSpec[] {
  const current = PHASE_ORDINAL[phase];
  return CAMPUS_ASSETS.filter((a) => PHASE_ORDINAL[a.phase] <= current);
}
