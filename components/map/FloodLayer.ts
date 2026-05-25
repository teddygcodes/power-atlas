import { PolygonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type {
  FloodFeature,
  FloodFeatureCollection,
  Position,
} from "../../types/geojson";

// Risk-red, deliberately distinct from water-blue: translucent fill + a stronger
// outline reads as a hazard overlay rather than a resource body.
const FLOOD = [209, 75, 75] as [number, number, number];

interface PolyDatum {
  polygon: Position[][]; // array of rings (exterior + holes)
  feature: FloodFeature;
}

function toPolys(fc: FloodFeatureCollection): PolyDatum[] {
  const out: PolyDatum[] = [];
  for (const feature of fc.features) {
    const g = feature.geometry;
    if (g.type === "Polygon") out.push({ polygon: g.coordinates, feature });
    else if (g.type === "MultiPolygon")
      for (const poly of g.coordinates) out.push({ polygon: poly, feature });
  }
  return out;
}

export function buildFloodLayers(params: {
  flood: FloodFeatureCollection;
  visible: boolean;
}): Layer[] {
  if (!params.visible) return [];
  return [
    new PolygonLayer<PolyDatum>({
      id: "flood-zones",
      data: toPolys(params.flood),
      getPolygon: (d) => d.polygon as unknown as number[][],
      filled: true,
      getFillColor: [...FLOOD, 65],
      stroked: true,
      getLineColor: [...FLOOD, 205],
      lineWidthUnits: "pixels",
      getLineWidth: 1,
      lineWidthMinPixels: 1,
      pickable: false,
    }),
  ];
}
