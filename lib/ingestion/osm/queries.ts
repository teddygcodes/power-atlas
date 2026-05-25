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

// Build an Overpass QL query for surface water within a bbox (v0.2).
// Water bodies (reservoir/lake/pond) are tagged natural=water on ways/relations;
// rivers/streams are waterways on ways (rivers can also be relations). `>;`
// recursion pulls member nodes/ways so geometry can be rebuilt.
//
// NAMED features only: requiring a `name` tag keeps meaningful, identifiable
// sources (named rivers/lakes/creeks) and drops the large long tail of unnamed
// retention ponds and drainage ditches — ~40k → ~8k for the default bbox.
// Unnamed micro-features are not meaningful water sources for siting.
export function buildWaterQuery(bbox: BboxSWNE): string {
  const [south, west, north, east] = bbox;
  const b = `(${south},${west},${north},${east})`;

  return [
    "[out:json][timeout:60];",
    "(",
    `  way["natural"="water"]["name"]${b};`,
    `  relation["natural"="water"]["name"]${b};`,
    `  way["waterway"="river"]["name"]${b};`,
    `  relation["waterway"="river"]["name"]${b};`,
    `  way["waterway"="stream"]["name"]${b};`,
    ");",
    "out body;",
    ">;",
    "out skel qt;",
  ].join("\n");
}
