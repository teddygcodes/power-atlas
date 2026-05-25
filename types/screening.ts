// Site-screening reverses the engine: run the EXISTING resolvers over a coarse grid
// and surface AREAS worth further diligence. This is a SCREENING tool, not a
// recommender — it NEVER names a best/optimal/recommended site. Each cell carries
// THREE INDEPENDENT qualitative ratings; there is deliberately NO composite score /
// rank / index. A cell is "worth investigating" iff it is not `unfavorable` on any
// dimension (a boolean AND), and the per-dimension breakdown is always shown.

export type ScreeningRating = "favorable" | "mixed" | "unfavorable";

// bbox order is [south, west, north, east] (matches source-manifest.json).
export type BboxSWNE = [number, number, number, number];

export interface DimensionDetail {
  rating: ScreeningRating;
  // Resolved distance from the resolver OUTPUT (km), surfaced for the breakdown —
  // null when there is no candidate / not applicable. NOT a threshold, NOT a claim.
  distanceKm: number | null;
  // The resolver's OWN reason codes, verbatim (rendered human-readable in the drawer).
  reasons: string[];
}

export interface ScreeningCell {
  center: [number, number]; // [lng, lat]
  polygon: [number, number][]; // square cell ring for rendering
  power: DimensionDetail;
  water: DimensionDetail;
  flood: DimensionDetail;
  worthInvestigating: boolean; // power!==unfavorable && water!==unfavorable && flood!==unfavorable
}

export interface ScreeningResult {
  cells: ScreeningCell[];
  bbox: BboxSWNE;
  spacingDeg: number;
  caveat: string; // the mandatory standing caveat
}
