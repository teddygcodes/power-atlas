import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { buildWaterQuery } from "../lib/ingestion/osm/queries";
import { fetchOverpass, OverpassError } from "../lib/ingestion/osm/overpassClient";
import { normalizeOsmWater } from "../lib/ingestion/osm/normalizeOsmWater";
import { applyWaterToManifest } from "../lib/storage/sourceManifest";
import { writeJsonFile, formatBytes } from "../lib/storage/localGeoJsonStore";
import { parseBbox, formatBbox } from "../lib/geo/bbox";
import type { BboxSWNE, SourceManifest } from "../types/ingestion";
import type { WaterFeature } from "../types/geojson";

const DEFAULT_REGION = "georgia-demo";
const DEFAULT_BBOX: BboxSWNE = [33.4, -84.8, 34.3, -83.8];

function parseArgs(argv: string[]): { region: string; bbox: BboxSWNE } {
  let region = process.env.DEFAULT_REGION ?? DEFAULT_REGION;
  let bbox: BboxSWNE = DEFAULT_BBOX;
  for (const arg of argv) {
    if (arg.startsWith("--region=")) region = arg.slice("--region=".length).trim();
    else if (arg.startsWith("--bbox=")) bbox = parseBbox(arg.slice("--bbox=".length));
  }
  return { region, bbox };
}

function sampleDigest(label: string, f: WaterFeature | undefined): void {
  if (!f) {
    console.log(`\n  [${label}] (none in dataset)`);
    return;
  }
  const p = f.properties;
  console.log(`\n  [${label}] sample feature:`);
  console.log(`    osmId:     ${p.osmId ?? p.id}`);
  console.log(`    name:      ${p.name ?? "(none)"}`);
  console.log(`    waterType: ${p.waterType}`);
  console.log(`    geometry:  ${f.geometry.type}`);
  console.log(`    rawTags:   ${JSON.stringify(p.rawTags)}`);
}

async function main() {
  const { region, bbox } = parseArgs(process.argv.slice(2));
  const lastSyncedAt = new Date().toISOString();
  const root = process.cwd();
  const rawPath = join(root, "data", "raw", region, "osm-water-raw.json");
  const outDir = join(root, "public", "geojson", region);
  const waterPath = join(outDir, "water.geojson");
  const manifestPath = join(outDir, "source-manifest.json");

  console.log("Power Atlas — OSM water ingestion (v0.2)");
  console.log(`  region: ${region}`);
  console.log(`  bbox:   ${formatBbox(bbox)}  [south,west,north,east]`);
  console.log("  source: Overpass API (named water only)\n");

  let raw;
  try {
    raw = await fetchOverpass(buildWaterQuery(bbox));
  } catch (err) {
    if (err instanceof OverpassError) {
      console.error(`\n✖ INGEST FAILED (${err.kind}): ${err.message}`);
      if (err.kind === "unreachable") {
        console.error("\n  STOP: live Overpass is unreachable. Not substituting mock data.");
      }
    } else {
      console.error("\n✖ INGEST FAILED:", err);
    }
    process.exitCode = 1;
    return;
  }

  const rawElementCount = raw.elements?.length ?? 0;
  console.log(`  received ${rawElementCount} raw OSM elements.`);
  if (rawElementCount === 0) {
    console.error("\n✖ Overpass returned 0 elements. Not writing empty water.geojson.");
    process.exitCode = 1;
    return;
  }

  const rawBytes = writeJsonFile(rawPath, raw);
  console.log(`  wrote raw dump → ${rawPath} (${formatBytes(rawBytes)})`);

  console.log("\nNormalizing…");
  const norm = normalizeOsmWater(raw, { bbox, lastSyncedAt });
  const waterBytes = writeJsonFile(waterPath, norm.water);

  // Merge water fields into the existing manifest (power writes it first via
  // ingest:region). Tolerant if the power manifest isn't present yet.
  let manifest: SourceManifest;
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as SourceManifest;
  } else {
    console.warn("  (no power manifest found — creating a water-only manifest; run ingest:region for both)");
    manifest = {
      region,
      bbox,
      source: "OSM Overpass",
      sourceUrl: "https://overpass-api.de/api/interpreter",
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
  const total = norm.water.features.length;
  writeJsonFile(manifestPath, applyWaterToManifest(manifest, total), true);

  console.log("\n── Output ─────────────────────────────────────");
  console.log(`  water.geojson  ${formatBytes(waterBytes).padStart(10)}  (${total} features)`);
  console.log(`  manifest updated with waterFeatureCount = ${total}`);

  console.log("\n── Counts by type ─────────────────────────────");
  console.log(`  rivers:      ${norm.counts.river}`);
  console.log(`  reservoirs:  ${norm.counts.reservoir}`);
  console.log(`  lakes:       ${norm.counts.lake}`);
  console.log(`  ponds:       ${norm.counts.pond}`);
  console.log(`  water(other):${norm.counts.water}`);
  console.log(`  streams:     ${norm.counts.stream}`);
  console.log(`  dropped:     ${norm.counts.droppedOther}`);

  sampleDigest("river", norm.water.features.find((f) => f.properties.waterType === "river"));
  sampleDigest(
    "water body",
    norm.water.features.find((f) =>
      ["reservoir", "lake", "pond", "water"].includes(f.properties.waterType),
    ),
  );
  sampleDigest("stream", norm.water.features.find((f) => f.properties.waterType === "stream"));

  console.log("\n✔ Water ingestion complete.");
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exitCode = 1;
});
