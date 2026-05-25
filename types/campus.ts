import type { BuildPhase } from "./timeline";

// 3D campus assets are COSMETIC schematic massing — representative blocks that
// communicate "campus footprint + major components", NOT an architectural or
// engineering site design. Labels are plain asset types only; there are never any
// per-asset specs (kV / MWh / gallons / dimensions). All geometry numbers below are
// ARBITRARY SCENE UNITS for relative massing, not real-world measurements.
export type CampusAssetId =
  | "site_pad"
  | "roads"
  | "substation_yard"
  | "transformers"
  | "generators"
  | "bess"
  | "cooling_plant"
  | "water_tanks"
  | "data_halls";

// Schematic primitives only (no CapsuleGeometry / detailed meshes).
export type CampusAssetShape = "box" | "cylinder" | "plane";

export interface CampusAssetSpec {
  id: CampusAssetId;
  label: string; // plain type label only — never a spec/number
  // The construction phase at which this asset first appears (reuses the v0.5
  // timeline ordinal). Reveal is cumulative across phases.
  phase: BuildPhase;
  shape: CampusAssetShape;
  // size: box = [width, height, depth]; cylinder = [radius, height, _]; plane =
  // [width, _, depth]. ARBITRARY SCENE UNITS — relative massing, not to scale.
  size: [number, number, number];
  // One entry per schematic instance, [x, z] on the pad (scene units). e.g. three
  // transformers = three positions. y is derived from size at render time.
  positions: [number, number][];
  color: string; // hex; schematic identity only
}
