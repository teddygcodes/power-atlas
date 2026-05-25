import type {
  FloodFeature,
  FloodFeatureCollection,
  PowerGeometry,
} from "../../../types/geojson";
import type { FloodFeatureProperties } from "../../../types/flood";
import type { BboxSWNE } from "../../../types/ingestion";
import type { RawFloodCollection } from "./floodClient";
import { simplifyGeometry } from "../../geo/simplify";

// Round coordinates to ~0.1 m (6 dp) to trim ArcGIS precision bloat. For
// polygons simplifyGeometry rounds ONLY (no vertex removal), so flood-zone
// containment (point-in-polygon) is unaffected — vertices are preserved.
const COORD_DP = 6;

// FEMA Flood Map Service Center — the authoritative source to verify against.
const FEMA_MSC_URL = "https://msc.fema.gov/";
const KNOWN_GEOMETRY = new Set(["Polygon", "MultiPolygon"]);

export interface NormalizedFlood {
  flood: FloodFeatureCollection;
  counts: {
    rawFeatures: number;
    kept: number;
    byZone: Record<string, number>;
    droppedOther: number;
  };
}

// Raw FEMA NFHL GeoJSON -> normalized FloodFeatureCollection. Attributes are
// preserved verbatim in rawTags; labeled source "fema" / "official" but cached.
export function normalizeFemaFlood(
  raw: RawFloodCollection,
  opts: { bbox: BboxSWNE; lastSyncedAt: string },
): NormalizedFlood {
  const features: FloodFeature[] = [];
  const byZone: Record<string, number> = {};
  let droppedOther = 0;

  for (const f of raw.features ?? []) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    if (!f.geometry || !KNOWN_GEOMETRY.has(f.geometry.type)) {
      droppedOther += 1;
      continue;
    }

    const rawTags: Record<string, string> = {};
    for (const [k, v] of Object.entries(props)) {
      if (v != null) rawTags[k] = String(v);
    }

    const zoneClass = (props.FLD_ZONE != null ? String(props.FLD_ZONE) : "").trim() || "UNKNOWN";
    const arId = props.FLD_AR_ID != null ? String(props.FLD_AR_ID) : null;

    const properties: FloodFeatureProperties = {
      id: arId ? `fema/${arId}` : `fema/${features.length}`,
      zoneClass,
      zoneSubtype: props.ZONE_SUBTY != null ? String(props.ZONE_SUBTY) : undefined,
      source: "fema",
      sourceUrl: FEMA_MSC_URL,
      sourceConfidence: "official",
      lastSyncedAt: opts.lastSyncedAt,
      bbox: opts.bbox,
      rawTags,
      cached: true,
    };

    // epsilon 0 is irrelevant for polygons (they are rounded only, never DP'd).
    const geometry = simplifyGeometry(f.geometry as unknown as PowerGeometry, 0, COORD_DP);
    features.push({ type: "Feature", geometry, properties });
    byZone[zoneClass] = (byZone[zoneClass] ?? 0) + 1;
  }

  return {
    flood: { type: "FeatureCollection", features },
    counts: {
      rawFeatures: (raw.features ?? []).length,
      kept: features.length,
      byZone,
      droppedOther,
    },
  };
}
