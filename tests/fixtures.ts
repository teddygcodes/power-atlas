import type { PowerFeature, PowerFeatureCollection, PowerGeometry } from "../types/geojson";
import type { PowerFeatureType } from "../types/infrastructure";

// Typed geometry builders (keep test geometries well-typed for tsc).
export const pt = (lng: number, lat: number): PowerGeometry => ({
  type: "Point",
  coordinates: [lng, lat],
});
export const line = (coords: [number, number][]): PowerGeometry => ({
  type: "LineString",
  coordinates: coords,
});
export const poly = (rings: [number, number][][]): PowerGeometry => ({
  type: "Polygon",
  coordinates: rings,
});
export const multiLine = (lines: [number, number][][]): PowerGeometry => ({
  type: "MultiLineString",
  coordinates: lines,
});
export const multiPoly = (polys: [number, number][][][]): PowerGeometry => ({
  type: "MultiPolygon",
  coordinates: polys,
});

export function makeFeature(opts: {
  id: string;
  geometry: PowerGeometry;
  type?: PowerFeatureType;
  voltage?: string;
  substationType?: string;
  name?: string;
}): PowerFeature {
  return {
    type: "Feature",
    geometry: opts.geometry,
    properties: {
      id: opts.id,
      type: opts.type ?? "substation",
      name: opts.name,
      voltage: opts.voltage,
      substationType: opts.substationType,
      source: "osm",
      sourceUrl: "https://www.openstreetmap.org/",
      sourceConfidence: "community",
      lastSyncedAt: "2026-01-01T00:00:00.000Z",
      osmId: opts.id,
      rawTags: {},
      capacityStatus: "unknown",
    },
  };
}

export function fc(features: PowerFeature[]): PowerFeatureCollection {
  return { type: "FeatureCollection", features };
}
