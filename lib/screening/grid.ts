import type { BboxSWNE } from "../../types/screening";

export interface GridCell {
  center: [number, number]; // [lng, lat]
  polygon: [number, number][]; // closed square ring
}

// Generate a COARSE grid of square cells across the bbox (S,W,N,E). Screening
// resolution, not survey — coarse keeps it honest and performant. Each cell spans
// [lat, lat+spacing] × [lng, lng+spacing], clamped to the bbox edges, with the
// center at the cell midpoint.
export function generateGrid(bbox: BboxSWNE, spacingDeg: number): GridCell[] {
  const [south, west, north, east] = bbox;
  const cells: GridCell[] = [];
  // Small epsilon so floating-point lat==north doesn't add a degenerate row.
  const eps = spacingDeg * 1e-6;
  for (let lat = south; lat < north - eps; lat += spacingDeg) {
    const latHi = Math.min(lat + spacingDeg, north);
    for (let lng = west; lng < east - eps; lng += spacingDeg) {
      const lngHi = Math.min(lng + spacingDeg, east);
      const center: [number, number] = [(lng + lngHi) / 2, (lat + latHi) / 2];
      const polygon: [number, number][] = [
        [lng, lat],
        [lngHi, lat],
        [lngHi, latHi],
        [lng, latHi],
        [lng, lat],
      ];
      cells.push({ center, polygon });
    }
  }
  return cells;
}
