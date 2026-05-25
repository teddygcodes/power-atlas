import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fetchNfhlFloodZones, FemaError } from "../lib/ingestion/fema/floodClient";
import { normalizeFemaFlood } from "../lib/ingestion/fema/normalizeFema";
import { applyFloodToManifest } from "../lib/storage/sourceManifest";
import { writeJsonFile, formatBytes } from "../lib/storage/localGeoJsonStore";
import { parseBbox, formatBbox } from "../lib/geo/bbox";
import type { BboxSWNE, SourceManifest } from "../types/ingestion";

const DEFAULT_REGION = "georgia-demo";
// Focused Atlanta corridor (the full georgia-demo bbox has ~64k flood polygons —
// far too large to commit). [south, west, north, east].
const DEFAULT_BBOX: BboxSWNE = [33.7, -84.45, 33.82, -84.3];
// Special Flood Hazard Areas (high-risk, 1%-annual-chance) only. Minimal-risk X
// zones are ~85% of the bytes and denote "outside an SFHA" — excluded to keep the
// committed file small; X areas resolve as "no mapped zone" (honest, caveated).
const SFHA_WHERE = "FLD_ZONE IN ('A','AE','AO','AH','AR','A99','V','VE')";

function parseArgs(argv: string[]): { region: string; bbox: BboxSWNE } {
  let region = process.env.DEFAULT_REGION ?? DEFAULT_REGION;
  let bbox: BboxSWNE = DEFAULT_BBOX;
  for (const arg of argv) {
    if (arg.startsWith("--region=")) region = arg.slice("--region=".length).trim();
    else if (arg.startsWith("--bbox=")) bbox = parseBbox(arg.slice("--bbox=".length));
  }
  return { region, bbox };
}

async function main() {
  const { region, bbox } = parseArgs(process.argv.slice(2));
  const lastSyncedAt = new Date().toISOString();
  const root = process.cwd();
  const rawPath = join(root, "data", "raw", region, "fema-flood-raw.json");
  const outDir = join(root, "public", "geojson", region);
  const floodPath = join(outDir, "flood-zones.geojson");
  const manifestPath = join(outDir, "source-manifest.json");

  console.log("Power Atlas — FEMA NFHL flood ingestion (v0.4)");
  console.log(`  region: ${region}`);
  console.log(`  bbox:   ${formatBbox(bbox)}  [south,west,north,east] (Atlanta corridor)`);
  console.log("  source: FEMA NFHL ArcGIS (statically cached for v0.4)\n");

  let raw;
  try {
    raw = await fetchNfhlFloodZones(bbox, { where: SFHA_WHERE });
  } catch (err) {
    if (err instanceof FemaError) {
      console.error(`\n✖ FLOOD INGEST FAILED (${err.kind}): ${err.message}`);
      if (err.kind === "unreachable") {
        console.error(
          "\n  STOP: FEMA NFHL is unreachable. NOT fabricating flood polygons.\n" +
            "  Run where hazards.fema.gov is reachable and copy flood-zones.geojson in,\n" +
            "  or ship honest-empty.",
        );
      }
    } else {
      console.error("\n✖ FLOOD INGEST FAILED:", err);
    }
    process.exitCode = 1;
    return;
  }

  const rawBytes = writeJsonFile(rawPath, raw);
  console.log(`  received ${raw.features?.length ?? 0} raw FEMA features → ${rawPath} (${formatBytes(rawBytes)})`);

  const norm = normalizeFemaFlood(raw, { bbox, lastSyncedAt });
  const floodBytes = writeJsonFile(floodPath, norm.flood);

  // Merge into the existing manifest (power/water write it first; tolerant if absent).
  let manifest: SourceManifest;
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SourceManifest;
  } else {
    manifest = {
      region,
      bbox,
      source: "OSM Overpass + FEMA NFHL",
      sourceUrl: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
      lastSyncedAt,
      rawFeatureCount: 0,
      substationCount: 0,
      transmissionLineCount: 0,
      powerPlantCount: 0,
      generatorCount: 0,
      warnings: [],
      limitations: [],
    };
  }
  writeJsonFile(manifestPath, applyFloodToManifest(manifest, norm.flood.features.length), true);

  console.log("\n── Output ─────────────────────────────────────");
  console.log(`  flood-zones.geojson  ${formatBytes(floodBytes).padStart(10)}  (${norm.counts.kept} zones)`);
  if (norm.counts.kept === 0) {
    console.warn("\n  ⚠ ZERO flood zones — wrote an HONEST-EMPTY layer (manifest: no flood data loaded).");
  }
  console.log("\n── Zone classes ───────────────────────────────");
  for (const [zone, n] of Object.entries(norm.counts.byZone).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${zone.padEnd(8)} ${n}`);
  }
  console.log(`  dropped (non-polygon): ${norm.counts.droppedOther}`);

  const sample = norm.flood.features.find((f) => f.properties.zoneClass === "AE") ?? norm.flood.features[0];
  if (sample) {
    console.log("\n  [sample zone]");
    console.log(`    id:        ${sample.properties.id}`);
    console.log(`    zoneClass: ${sample.properties.zoneClass}`);
    console.log(`    geometry:  ${sample.geometry.type}`);
    console.log(`    source:    ${sample.properties.source} / ${sample.properties.sourceConfidence} (cached)`);
    console.log(`    rawTags:   ${JSON.stringify(sample.properties.rawTags)}`);
  }

  console.log("\n✔ Flood ingestion complete.");
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exitCode = 1;
});
