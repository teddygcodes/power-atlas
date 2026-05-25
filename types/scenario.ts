export type CampusSizeMW = 50 | 100 | 250 | 500;

// Campus cooling type — a scenario property (not ingested). Refines water demand
// only; it does NOT affect power demand in this model.
export type CoolingType = "air" | "evaporative" | "hybrid";

export interface DataCenterScenario {
  campusSizeMW: CampusSizeMW;
  coordinates: [number, number]; // [lng, lat]
  // Optional; the water resolver defaults to "hybrid" when absent (preserves
  // the pre-cooling MW-only behavior).
  coolingType?: CoolingType;
}
