import osmtogeojson from "osmtogeojson";
import type { OverpassResponse } from "./osmTypes";
import type { WaterFeature, WaterFeatureCollection, PowerGeometry } from "../../../types/geojson";
import type { WaterFeatureProperties, WaterFeatureType } from "../../../types/water";
import type { BboxSWNE } from "../../../types/ingestion";
import { getRepresentativeCoordinate } from "../../geo/centroid";
import { simplifyGeometry } from "../../geo/simplify";

const OSM_BASE_URL = "https://www.openstreetmap.org/";

// Display-geometry simplification tolerance (degrees, ~11m). Analysis uses
// repCoord computed from full-res geometry before simplifying.
const SIMPLIFY_EPSILON = 0.0001;

export interface NormalizedWater {
  water: WaterFeatureCollection;
  counts: {
    rawGeoJsonFeatures: number;
    river: number;
    reservoir: number;
    lake: number;
    pond: number;
    water: number;
    stream: number;
    droppedOther: number;
  };
}

function mapWaterType(tags: Record<string, string>): WaterFeatureType {
  if (tags.waterway === "river") return "river";
  if (tags.waterway === "stream") return "stream";
  if (tags.natural === "water") {
    switch (tags.water) {
      case "reservoir":
        return "reservoir";
      case "lake":
        return "lake";
      case "pond":
        return "pond";
      default:
        return "water";
    }
  }
  return "unknown_water";
}

const KNOWN_GEOMETRY = new Set([
  "Point",
  "LineString",
  "Polygon",
  "MultiLineString",
  "MultiPolygon",
]);

// Raw Overpass JSON -> a single water FeatureCollection with normalized,
// honestly-labeled properties. Mirrors normalizeOsmPower. Raw tags preserved.
export function normalizeOsmWater(
  raw: OverpassResponse,
  opts: { bbox: BboxSWNE; lastSyncedAt: string },
): NormalizedWater {
  const gj = osmtogeojson(raw as never) as unknown as {
    features: Array<{
      id?: string | number;
      geometry: { type: string };
      properties: Record<string, string> | null;
    }>;
  };

  const features: WaterFeature[] = [];
  const counts = {
    rawGeoJsonFeatures: gj.features.length,
    river: 0,
    reservoir: 0,
    lake: 0,
    pond: 0,
    water: 0,
    stream: 0,
    droppedOther: 0,
  };

  for (const f of gj.features) {
    const tags = { ...(f.properties ?? {}) };
    delete (tags as Record<string, string>).id;

    const waterType = mapWaterType(tags);
    if (waterType === "unknown_water") {
      counts.droppedOther += 1;
      continue;
    }
    if (!KNOWN_GEOMETRY.has(f.geometry.type)) {
      counts.droppedOther += 1;
      continue;
    }
    const geometry = f.geometry as unknown as PowerGeometry;
    const osmId = f.id != null ? String(f.id) : undefined;

    // Compute repCoord from FULL-resolution geometry, THEN simplify for display.
    const repCoord = getRepresentativeCoordinate({ geometry }) ?? undefined;
    const displayGeometry = simplifyGeometry(geometry, SIMPLIFY_EPSILON);

    const properties: WaterFeatureProperties = {
      id: osmId ?? `${waterType}/${features.length}`,
      waterType,
      name: tags.name,
      source: "osm",
      sourceUrl: OSM_BASE_URL,
      sourceConfidence: "community",
      lastSyncedAt: opts.lastSyncedAt,
      bbox: opts.bbox,
      osmId,
      rawTags: tags,
      capacityStatus: "unknown",
      repCoord,
    };

    features.push({ type: "Feature", geometry: displayGeometry, properties });
    counts[waterType] += 1;
  }

  return {
    water: { type: "FeatureCollection", features },
    counts,
  };
}
