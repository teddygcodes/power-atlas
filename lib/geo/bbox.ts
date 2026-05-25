import type { BboxSWNE } from "../../types/ingestion";

// Pure / isomorphic — safe to import from both the ingest script and the browser.

export function parseBbox(input: string): BboxSWNE {
  const parts = input.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(
      `Invalid bbox "${input}". Expected "south,west,north,east" (4 numbers).`,
    );
  }
  const [south, west, north, east] = parts;
  if (south >= north) {
    throw new Error(`Invalid bbox: south (${south}) must be < north (${north}).`);
  }
  if (west >= east) {
    throw new Error(`Invalid bbox: west (${west}) must be < east (${east}).`);
  }
  return [south, west, north, east];
}

export function formatBbox(bbox: BboxSWNE): string {
  return bbox.join(",");
}
