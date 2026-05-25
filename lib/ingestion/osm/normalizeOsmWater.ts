import osmtogeojson from "osmtogeojson";
import type { OverpassResponse } from "./osmTypes";
import type { WaterFeature, WaterFeatureCollection, PowerGeometry } from "../../../types/geojson";
import type { WaterFeatureProperties, WaterFeatureType } from "../../../types/water";
import type { BboxSWNE } from "../../../types/ingestion";

const OSM_BASE_URL = "https://www.openstreetmap.org/";

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
    };

    features.push({ type: "Feature", geometry, properties });
    counts[waterType] += 1;
  }

  return {
    water: { type: "FeatureCollection", features },
    counts,
  };
}
