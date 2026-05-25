import type { Position, PowerGeometry } from "../../types/geojson";
import { haversineKm } from "./distance";

// Pure / isomorphic. Ray-casting containment + nearest-vertex distance, for the
// flood RISK resolver (campus-in / near a zone). Reused, tested geo.

function pointInRing(pt: [number, number], ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Inside a polygon = inside its exterior ring AND not inside any hole ring.
function pointInPolygonRings(pt: [number, number], rings: Position[][]): boolean {
  if (rings.length === 0 || !pointInRing(pt, rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(pt, rings[h])) return false; // in a hole
  }
  return true;
}

export function pointInPolygon(pt: [number, number], geometry: PowerGeometry): boolean {
  if (geometry.type === "Polygon") return pointInPolygonRings(pt, geometry.coordinates);
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates.some((poly) => pointInPolygonRings(pt, poly));
  return false; // points / lines are not areas
}

// Distance (km) from a point to the nearest vertex of a geometry. Honest for the
// "near a zone" case on large polygons — a centroid distance would understate
// edge proximity. null if the geometry has no usable coordinates.
export function nearestVertexDistanceKm(
  pt: [number, number],
  geometry: PowerGeometry,
): number | null {
  let min = Infinity;
  const scan = (coords: Position[]) => {
    for (const c of coords) {
      const d = haversineKm(pt, [c[0], c[1]]);
      if (d < min) min = d;
    }
  };
  const g = geometry;
  if (g.type === "Polygon") g.coordinates.forEach(scan);
  else if (g.type === "MultiPolygon") g.coordinates.forEach((poly) => poly.forEach(scan));
  else if (g.type === "LineString") scan(g.coordinates);
  else if (g.type === "MultiLineString") g.coordinates.forEach(scan);
  else if (g.type === "Point") scan([g.coordinates]);
  return min === Infinity ? null : min;
}
