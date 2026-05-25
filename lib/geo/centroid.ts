import type { PowerGeometry, Position } from "../../types/geojson";

// Pure / isomorphic. Returns a single representative [lng, lat] for a feature,
// or null if none can be derived.
//
// The Polygon branch is the MAIN code path: ~97% of substations are polygons,
// so the area-weighted exterior-ring centroid is load-bearing, not an edge case.

function xy(p: Position): [number, number] {
  return [p[0], p[1]];
}

// Area-weighted centroid of a (closed or open) ring in lng/lat space. Planar
// approximation — fine for the small footprints of substations.
function ringCentroid(ringIn: Position[]): [number, number] | null {
  let ring = ringIn.map(xy);
  // Drop a duplicated closing vertex if present.
  if (
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    ring = ring.slice(0, -1);
  }
  const n = ring.length;
  if (n === 0) return null;
  if (n === 1) return ring[0];
  if (n === 2) {
    return [(ring[0][0] + ring[1][0]) / 2, (ring[0][1] + ring[1][1]) / 2];
  }

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;

  if (Math.abs(area) < 1e-14) {
    // Degenerate (collinear / zero-area) ring → fall back to vertex mean.
    let sx = 0;
    let sy = 0;
    for (const p of ring) {
      sx += p[0];
      sy += p[1];
    }
    return [sx / n, sy / n];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

// The vertex at the middle index — an actual point ON the line, never the first.
function lineMidpoint(coords: Position[]): [number, number] | null {
  if (coords.length === 0) return null;
  return xy(coords[Math.floor(coords.length / 2)]);
}

function planarLength(coords: Position[]): number {
  let len = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    len += Math.hypot(dx, dy);
  }
  return len;
}

// Accepts any geometry-bearing feature (power or water) — only the geometry is used.
export function getRepresentativeCoordinate(
  feature: { geometry: PowerGeometry },
): [number, number] | null {
  const g = feature.geometry;
  switch (g.type) {
    case "Point":
      return xy(g.coordinates);
    case "LineString":
      return lineMidpoint(g.coordinates);
    case "Polygon":
      // Centroid of the exterior ring — the main substation path.
      return g.coordinates.length ? ringCentroid(g.coordinates[0]) : null;
    case "MultiLineString": {
      if (!g.coordinates.length) return null;
      let longest = g.coordinates[0];
      let max = planarLength(longest);
      for (const line of g.coordinates) {
        const len = planarLength(line);
        if (len > max) {
          max = len;
          longest = line;
        }
      }
      return lineMidpoint(longest);
    }
    case "MultiPolygon":
      // Centroid of the first polygon's exterior ring (acceptable for v0.1).
      return g.coordinates.length && g.coordinates[0].length
        ? ringCentroid(g.coordinates[0][0])
        : null;
    default:
      return null;
  }
}
