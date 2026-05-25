import type { PowerFeature } from "../../types/geojson";
import { getRepresentativeCoordinate } from "./centroid";
import { haversineKm } from "./distance";

export interface NearestResult {
  feature: PowerFeature;
  distanceKm: number;
  coordinates: [number, number]; // the feature's representative coordinate
}

// Nearest feature to `from` ([lng, lat]) by representative coordinate.
// Features whose geometry yields no representative coordinate are skipped.
export function nearestFeature(
  from: [number, number],
  features: PowerFeature[],
): NearestResult | null {
  let best: NearestResult | null = null;
  for (const feature of features) {
    const coordinates = getRepresentativeCoordinate(feature);
    if (!coordinates) continue;
    const distanceKm = haversineKm(from, coordinates);
    if (best === null || distanceKm < best.distanceKm) {
      best = { feature, distanceKm, coordinates };
    }
  }
  return best;
}
