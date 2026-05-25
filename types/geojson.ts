import type { PowerFeatureProperties } from "./infrastructure";

// Minimal GeoJSON geometry typing — enough for power features without a
// dependency on @types/geojson. Coordinates are [lng, lat] tuples.
export type Position = [number, number] | [number, number, number];

export interface PointGeometry {
  type: "Point";
  coordinates: Position;
}
export interface LineStringGeometry {
  type: "LineString";
  coordinates: Position[];
}
export interface PolygonGeometry {
  type: "Polygon";
  coordinates: Position[][];
}
export interface MultiLineStringGeometry {
  type: "MultiLineString";
  coordinates: Position[][];
}
export interface MultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: Position[][][];
}

export type PowerGeometry =
  | PointGeometry
  | LineStringGeometry
  | PolygonGeometry
  | MultiLineStringGeometry
  | MultiPolygonGeometry;

export interface PowerFeature {
  type: "Feature";
  geometry: PowerGeometry;
  properties: PowerFeatureProperties;
}

export interface PowerFeatureCollection {
  type: "FeatureCollection";
  features: PowerFeature[];
}

export function emptyFeatureCollection(): PowerFeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
