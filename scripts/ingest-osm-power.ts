import { join } from "node:path";
import { buildPowerQuery } from "../lib/ingestion/osm/queries";
import {
  fetchOverpass,
  OverpassError,
} from "../lib/ingestion/osm/overpassClient";
import { normalizeOsmPower } from "../lib/ingestion/osm/normalizeOsmPower";
import { buildSourceManifest } from "../lib/storage/sourceManifest";
import { writeJsonFile, formatBytes } from "../lib/storage/localGeoJsonStore";
import { parseBbox, formatBbox } from "../lib/geo/bbox";
import type { BboxSWNE } from "../types/ingestion";
import type { PowerFeature } from "../types/geojson";

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

function sampleFeatureDigest(label: string, f: PowerFeature | undefined): void {
  if (!f) {
    console.log(`\n  [${label}] (none in dataset)`);
    return;
  }
  const p = f.properties;
  console.log(`\n  [${label}] sample feature:`);
  console.log(`    osmId:        ${p.osmId ?? p.id}`);
  console.log(`    name:         ${p.name ?? "(none)"}`);
  console.log(`    geometry:     ${f.geometry.type}`);
  console.log(`    voltage(raw): ${p.voltage ?? "(missing)"}`);
  console.log(`    confidence:   ${p.sourceConfidence}`);
  console.log(`    capacity:     ${p.capacityStatus}`);
  console.log(`    rawTags:      ${JSON.stringify(p.rawTags)}`);
}

async function main() {
  const { region, bbox } = parseArgs(process.argv.slice(2));
  const lastSyncedAt = new Date().toISOString();

  const root = process.cwd();
  const rawPath = join(root, "data", "raw", region, "osm-power-raw.json");
  const outDir = join(root, "public", "geojson", region);
  const paths = {
    substations: join(outDir, "substations.geojson"),
    transmissionLines: join(outDir, "transmission-lines.geojson"),
    powerPlants: join(outDir, "power-plants.geojson"),
    manifest: join(outDir, "source-manifest.json"),
  };

  console.log("Power Atlas — OSM power ingestion");
  console.log(`  region: ${region}`);
  console.log(`  bbox:   ${formatBbox(bbox)}  [south,west,north,east]`);
  console.log("  source: Overpass API (server/script-only)\n");

  const query = buildPowerQuery(bbox);
  console.log("Querying Overpass…");

  let raw;
  try {
    raw = await fetchOverpass(query);
  } catch (err) {
    if (err instanceof OverpassError) {
      console.error(`\n✖ INGEST FAILED (${err.kind}): ${err.message}`);
      if (err.kind === "unreachable") {
        console.error(
          "\n  STOP: live Overpass is unreachable from this environment.\n" +
            "  Not substituting mock data. Run this script on a machine with outbound\n" +
            "  access and drop the resulting GeoJSON into public/geojson/" +
            region +
            "/.",
        );
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
    console.error(
      "\n✖ Overpass returned 0 elements. Not writing empty FeatureCollections. " +
        "Check the bbox / query before proceeding.",
    );
    process.exitCode = 1;
    return;
  }

  const rawBytes = writeJsonFile(rawPath, raw);
  console.log(`  wrote raw dump → ${rawPath} (${formatBytes(rawBytes)})`);

  console.log("\nNormalizing…");
  const norm = normalizeOsmPower(raw, { bbox, lastSyncedAt });

  const manifest = buildSourceManifest({
    region,
    bbox,
    lastSyncedAt,
    rawFeatureCount: norm.counts.rawGeoJsonFeatures,
    substationCount: norm.counts.substation,
    transmissionLineCount: norm.counts.transmission_line,
    powerPlantCount: norm.counts.power_plant,
    generatorCount: norm.counts.generator,
  });

  const sizes = {
    substations: writeJsonFile(paths.substations, norm.substations),
    transmissionLines: writeJsonFile(paths.transmissionLines, norm.transmissionLines),
    powerPlants: writeJsonFile(paths.powerPlants, norm.powerPlants),
    manifest: writeJsonFile(paths.manifest, manifest, true),
  };

  console.log("\n── Output files ───────────────────────────────");
  console.log(`  substations.geojson        ${formatBytes(sizes.substations).padStart(10)}  (${norm.counts.substation} features)`);
  console.log(`  transmission-lines.geojson ${formatBytes(sizes.transmissionLines).padStart(10)}  (${norm.counts.transmission_line} features)`);
  console.log(`  power-plants.geojson       ${formatBytes(sizes.powerPlants).padStart(10)}  (${norm.counts.power_plant} plants + ${norm.counts.generator} generators)`);
  console.log(`  source-manifest.json       ${formatBytes(sizes.manifest).padStart(10)}`);

  // Voltage coverage on substations — a key sanity signal (~96% expected).
  const subsWithVoltage = norm.substations.features.filter(
    (f) => f.properties.voltage != null && f.properties.voltage !== "",
  ).length;
  const subTotal = norm.substations.features.length;
  const pct = subTotal ? ((subsWithVoltage / subTotal) * 100).toFixed(1) : "0";

  console.log("\n── Sanity checks ──────────────────────────────");
  console.log(`  substations:        ${subTotal}  (ground-truth ≈ 579)`);
  console.log(`  transmission lines: ${norm.counts.transmission_line}  (ground-truth ≈ 2152)`);
  console.log(`  voltage on subs:    ${subsWithVoltage}/${subTotal}  (${pct}%, expected ≈ 96%)`);
  console.log(`  dropped (no power tag): ${norm.counts.droppedOther}`);

  sampleFeatureDigest("substation", norm.substations.features[0]);
  sampleFeatureDigest("transmission_line", norm.transmissionLines.features[0]);

  console.log("\n✔ Ingestion complete.");
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exitCode = 1;
});
