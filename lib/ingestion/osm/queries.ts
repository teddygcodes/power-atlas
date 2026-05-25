import type { BboxSWNE } from "../../../types/ingestion";

// Build an Overpass QL query for power infrastructure within a bbox.
// bbox is ordered [south, west, north, east] — the Overpass area-filter order.
//
// Relations are queried for substations and plants on purpose: large plants and
// some substations are tagged as relations (multipolygons), not single ways.
// The `>;` recursion pulls in the member nodes/ways so geometry can be rebuilt.
export function buildPowerQuery(bbox: BboxSWNE): string {
  const [south, west, north, east] = bbox;
  const b = `(${south},${west},${north},${east})`;

  return [
    "[out:json][timeout:60];",
    "(",
    `  node["power"="substation"]${b};`,
    `  way["power"="substation"]${b};`,
    `  relation["power"="substation"]${b};`,
    `  way["power"="line"]${b};`,
    `  relation["power"="line"]${b};`,
    `  node["power"="plant"]${b};`,
    `  way["power"="plant"]${b};`,
    `  relation["power"="plant"]${b};`,
    `  node["power"="generator"]${b};`,
    `  way["power"="generator"]${b};`,
    ");",
    "out body;",
    ">;",
    "out skel qt;",
  ].join("\n");
}
