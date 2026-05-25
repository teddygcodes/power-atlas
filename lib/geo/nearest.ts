import type { PowerGeometry } from "../../types/geojson";
import { getRepresentativeCoordinate } from "./centroid";
import { haversineKm } from "./distance";

export interface NearestResult<T> {
  feature: T;
  distanceKm: number;
  coordinates: [number, number]; // the feature's representative coordinate
}

// Nearest feature to `from` ([lng, lat]) by representative coordinate. Generic
// over the feature type (power or water); only the geometry is read. Features
// whose geometry yields no representative coordinate are skipped.
export function nearestFeature<T extends { geometry: PowerGeometry }>(
  from: [number, number],
  features: T[],
): NearestResult<T> | null {
  let best: NearestResult<T> | null = null;
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
