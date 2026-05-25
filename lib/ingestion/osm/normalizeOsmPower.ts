import osmtogeojson from "osmtogeojson";
import type { OverpassResponse } from "./osmTypes";
import type {
  PowerFeature,
  PowerFeatureCollection,
  PowerGeometry,
} from "../../../types/geojson";
import type {
  PowerFeatureProperties,
  PowerFeatureType,
} from "../../../types/infrastructure";
import type { BboxSWNE } from "../../../types/ingestion";

const OSM_BASE_URL = "https://www.openstreetmap.org/";

export interface NormalizedPower {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
  // power-plants layer is generation CONTEXT: it holds both plants and
  // generators. Neither is ever fed to the dependency resolver.
  powerPlants: PowerFeatureCollection;
  counts: {
    rawGeoJsonFeatures: number;
    substation: number;
    transmission_line: number;
    power_plant: number;
    generator: number;
    droppedOther: number;
  };
}

function mapPowerType(power: string | undefined): PowerFeatureType {
  switch (power) {
    case "substation":
      return "substation";
    case "line":
      return "transmission_line";
    case "plant":
      return "power_plant";
    case "generator":
      return "generator";
    default:
      return "unknown_power";
  }
}

// Raw Overpass JSON -> three power FeatureCollections with normalized,
// honestly-labeled properties. Voltage is preserved as the RAW OSM string.
export function normalizeOsmPower(
  raw: OverpassResponse,
  opts: { bbox: BboxSWNE; lastSyncedAt: string },
): NormalizedPower {
  // osmtogeojson handles polygon vs line decisions and rebuilds relation
  // geometry from the recursed members. Cast via unknown: its @types/geojson
  // return type is wider (includes GeometryCollection) than our PowerGeometry.
  const gj = osmtogeojson(raw as never) as unknown as {
    features: Array<{
      id?: string | number;
      geometry: { type: string };
      properties: Record<string, string> | null;
    }>;
  };

  const KNOWN_GEOMETRY = new Set([
    "Point",
    "LineString",
    "Polygon",
    "MultiLineString",
    "MultiPolygon",
  ]);

  const substations: PowerFeature[] = [];
  const transmissionLines: PowerFeature[] = [];
  const powerPlants: PowerFeature[] = [];
  let droppedOther = 0;

  for (const f of gj.features) {
    const tags = { ...(f.properties ?? {}) };
    // osmtogeojson injects a non-OSM `id` key into properties; strip it so
    // rawTags reflects only genuine OSM tags.
    delete (tags as Record<string, string>).id;

    const type = mapPowerType(tags.power);
    if (type === "unknown_power") {
      droppedOther += 1;
      continue;
    }
    if (!KNOWN_GEOMETRY.has(f.geometry.type)) {
      // e.g. a rare relation that osmtogeojson emits as a GeometryCollection.
      droppedOther += 1;
      continue;
    }
    const geometry = f.geometry as unknown as PowerGeometry;

    const osmId = f.id != null ? String(f.id) : undefined;

    const properties: PowerFeatureProperties = {
      id: osmId ?? `${type}/${substations.length + transmissionLines.length + powerPlants.length}`,
      type,
      name: tags.name,
      voltage: tags.voltage, // RAW string, verbatim. May be missing / multi-valued.
      substationType: tags.substation,
      source: "osm",
      sourceUrl: OSM_BASE_URL,
      sourceConfidence: "community",
      lastSyncedAt: opts.lastSyncedAt,
      bbox: opts.bbox,
      osmId,
      rawTags: tags,
      capacityStatus: "unknown",
    };

    const feature: PowerFeature = {
      type: "Feature",
      geometry,
      properties,
    };

    if (type === "substation") substations.push(feature);
    else if (type === "transmission_line") transmissionLines.push(feature);
    else powerPlants.push(feature); // power_plant + generator (context layer)
  }

  return {
    substations: { type: "FeatureCollection", features: substations },
    transmissionLines: { type: "FeatureCollection", features: transmissionLines },
    powerPlants: { type: "FeatureCollection", features: powerPlants },
    counts: {
      rawGeoJsonFeatures: gj.features.length,
      substation: substations.length,
      transmission_line: transmissionLines.length,
      power_plant: powerPlants.filter((f) => f.properties.type === "power_plant").length,
      generator: powerPlants.filter((f) => f.properties.type === "generator").length,
      droppedOther,
    },
  };
}
