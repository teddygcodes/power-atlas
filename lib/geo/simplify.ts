import type { Position, PowerGeometry } from "../../types/geojson";

// Pure / isomorphic. Display-geometry simplification for committed GeoJSON size.
// This NEVER touches the analysis path: the resolver reads the precomputed
// `repCoord` (from full-resolution geometry), not these simplified vertices.
//
// Lines: Douglas-Peucker + coordinate rounding. Polygons: rounding only (rings
// stay valid/closed; the heavy payload is lines, and substations/water bodies
// are not the bulk). Points: rounding only.

function roundN(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function roundCoord(p: Position, dp = 5): Position {
  return p.length === 3
    ? [roundN(p[0], dp), roundN(p[1], dp), roundN(p[2], dp)]
    : [roundN(p[0], dp), roundN(p[1], dp)];
}

// Perpendicular distance from p to segment a–b (planar lng/lat approximation).
function segmentDistance(p: Position, a: Position, b: Position): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Ramer–Douglas–Peucker. Endpoints always preserved.
export function simplifyLine(points: Position[], epsilon: number): Position[] {
  if (points.length <= 2) return points;
  const end = points.length - 1;
  let maxDist = 0;
  let index = 0;
  for (let i = 1; i < end; i++) {
    const d = segmentDistance(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = simplifyLine(points.slice(0, index + 1), epsilon);
    const right = simplifyLine(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

export function simplifyGeometry(
  g: PowerGeometry,
  epsilon: number,
  dp = 5,
): PowerGeometry {
  const dpLine = (pts: Position[]) =>
    simplifyLine(pts, epsilon).map((p) => roundCoord(p, dp));
  const roundRing = (r: Position[]) => r.map((p) => roundCoord(p, dp));

  switch (g.type) {
    case "Point":
      return { type: "Point", coordinates: roundCoord(g.coordinates, dp) };
    case "LineString":
      return { type: "LineString", coordinates: dpLine(g.coordinates) };
    case "MultiLineString":
      return { type: "MultiLineString", coordinates: g.coordinates.map(dpLine) };
    case "Polygon":
      return { type: "Polygon", coordinates: g.coordinates.map(roundRing) };
    case "MultiPolygon":
      return {
        type: "MultiPolygon",
        coordinates: g.coordinates.map((poly) => poly.map(roundRing)),
      };
  }
}
