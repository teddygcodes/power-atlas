import { ScatterplotLayer, PathLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type {
  PowerFeature,
  PowerFeatureCollection,
  Position,
} from "../../types/geojson";
import { representativeCoordinate } from "../../lib/geo/centroid";

// RGB(A) mirrors of the tailwind `signal.*` palette (0–255).
export const COLORS = {
  substation: [94, 200, 216] as [number, number, number],
  transmission: [224, 164, 88] as [number, number, number],
  plant: [155, 140, 206] as [number, number, number],
  candidate: [255, 107, 94] as [number, number, number],
};

export interface LayerVisibility {
  substations: boolean;
  transmission: boolean;
  plants: boolean;
  candidatePath: boolean;
  water: boolean;
  waterPath: boolean;
  flood: boolean;
}

interface PointDatum {
  position: [number, number];
  feature: PowerFeature;
}

interface PathDatum {
  path: Position[];
  feature: PowerFeature;
}

function toPoints(fc: PowerFeatureCollection): PointDatum[] {
  const out: PointDatum[] = [];
  for (const feature of fc.features) {
    const position = representativeCoordinate(feature);
    if (position) out.push({ position, feature });
  }
  return out;
}

function toPaths(fc: PowerFeatureCollection): PathDatum[] {
  const out: PathDatum[] = [];
  for (const feature of fc.features) {
    const g = feature.geometry;
    if (g.type === "LineString") {
      out.push({ path: g.coordinates, feature });
    } else if (g.type === "MultiLineString") {
      for (const line of g.coordinates) out.push({ path: line, feature });
    }
  }
  return out;
}

// deck.gl layers for the three infrastructure datasets. The candidate
// substation is highlighted in the candidate color so the resolved dependency
// is visually traceable on the map.
export function buildInfrastructureLayers(params: {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
  powerPlants: PowerFeatureCollection;
  visibility: LayerVisibility;
  candidateFeatureId?: string;
}): Layer[] {
  const { visibility, candidateFeatureId } = params;
  const layers: Layer[] = [];

  // Transmission lines first (drawn underneath the point layers).
  if (visibility.transmission) {
    layers.push(
      new PathLayer<PathDatum>({
        id: "transmission-lines",
        data: toPaths(params.transmissionLines),
        getPath: (d) => d.path,
        getColor: [...COLORS.transmission, 150],
        getWidth: 1.5,
        widthUnits: "pixels",
        widthMinPixels: 1,
        capRounded: true,
        jointRounded: true,
        pickable: false,
      }),
    );
  }

  if (visibility.plants) {
    layers.push(
      new ScatterplotLayer<PointDatum>({
        id: "power-plants",
        data: toPoints(params.powerPlants),
        getPosition: (d) => d.position,
        getFillColor: [...COLORS.plant, 180],
        getLineColor: [10, 14, 20, 255],
        stroked: true,
        lineWidthMinPixels: 1,
        getRadius: 5,
        radiusUnits: "pixels",
        radiusMinPixels: 4,
        radiusMaxPixels: 9,
        pickable: true,
      }),
    );
  }

  if (visibility.substations) {
    layers.push(
      new ScatterplotLayer<PointDatum>({
        id: "substations",
        data: toPoints(params.substations),
        getPosition: (d) => d.position,
        getFillColor: (d) =>
          d.feature.properties.id === candidateFeatureId
            ? [...COLORS.candidate, 255]
            : [...COLORS.substation, 210],
        getRadius: (d) =>
          d.feature.properties.id === candidateFeatureId ? 7 : 4,
        radiusUnits: "pixels",
        radiusMinPixels: 3,
        radiusMaxPixels: 10,
        stroked: true,
        getLineColor: [10, 14, 20, 255],
        lineWidthMinPixels: 1,
        pickable: true,
        updateTriggers: {
          getFillColor: candidateFeatureId,
          getRadius: candidateFeatureId,
        },
      }),
    );
  }

  return layers;
}
