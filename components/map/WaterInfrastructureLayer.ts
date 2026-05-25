import { PathLayer, PolygonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type {
  WaterFeature,
  WaterFeatureCollection,
  Position,
} from "../../types/geojson";

// Distinct blue, separate from power's cyan substations / amber transmission.
const WATER = [74, 163, 224] as [number, number, number];
const CANDIDATE = [127, 210, 255] as [number, number, number]; // bright highlight

interface LinePath {
  path: Position[];
  feature: WaterFeature;
}
interface Poly {
  polygon: Position[];
  feature: WaterFeature;
}

function toLinePaths(fc: WaterFeatureCollection): LinePath[] {
  const out: LinePath[] = [];
  for (const feature of fc.features) {
    const g = feature.geometry;
    if (g.type === "LineString") out.push({ path: g.coordinates, feature });
    else if (g.type === "MultiLineString")
      for (const line of g.coordinates) out.push({ path: line, feature });
  }
  return out;
}

function toPolys(fc: WaterFeatureCollection): Poly[] {
  const out: Poly[] = [];
  for (const feature of fc.features) {
    const g = feature.geometry;
    if (g.type === "Polygon") out.push({ polygon: g.coordinates[0], feature });
    else if (g.type === "MultiPolygon")
      for (const poly of g.coordinates) out.push({ polygon: poly[0], feature });
  }
  return out;
}

export function buildWaterLayers(params: {
  water: WaterFeatureCollection;
  visible: boolean;
  candidateFeatureId?: string;
}): Layer[] {
  if (!params.visible) return [];
  const { candidateFeatureId } = params;
  const isCandidate = (f: WaterFeature) => f.properties.id === candidateFeatureId;

  return [
    new PolygonLayer<Poly>({
      id: "water-bodies",
      data: toPolys(params.water),
      getPolygon: (d) => d.polygon as number[][],
      filled: true,
      getFillColor: (d) =>
        isCandidate(d.feature) ? [...CANDIDATE, 130] : [...WATER, 70],
      stroked: true,
      getLineColor: (d) =>
        isCandidate(d.feature) ? [...CANDIDATE, 255] : [...WATER, 200],
      lineWidthMinPixels: 1,
      getLineWidth: 1,
      pickable: false,
      updateTriggers: { getFillColor: candidateFeatureId, getLineColor: candidateFeatureId },
    }),
    new PathLayer<LinePath>({
      id: "water-lines",
      data: toLinePaths(params.water),
      getPath: (d) => d.path,
      getColor: (d) => (isCandidate(d.feature) ? [...CANDIDATE, 255] : [...WATER, 200]),
      getWidth: (d) =>
        isCandidate(d.feature) ? 3 : d.feature.properties.waterType === "river" ? 2.5 : 1.2,
      widthUnits: "pixels",
      widthMinPixels: 1,
      capRounded: true,
      jointRounded: true,
      pickable: false,
      updateTriggers: { getColor: candidateFeatureId, getWidth: candidateFeatureId },
    }),
  ];
}
