import { ScatterplotLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";

interface CampusDatum {
  position: [number, number];
}

// The hypothetical data-center campus. A single bright, outlined marker that
// reads clearly against the dark basemap and the power infrastructure.
export function buildCampusLayer(coordinates: [number, number]): Layer {
  return new ScatterplotLayer<CampusDatum>({
    id: "campus-marker",
    data: [{ position: coordinates }],
    getPosition: (d) => d.position,
    getFillColor: [242, 244, 247, 255],
    getLineColor: [10, 14, 20, 255],
    stroked: true,
    lineWidthMinPixels: 2,
    getRadius: 8,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 12,
    pickable: false,
    updateTriggers: {
      getPosition: [coordinates[0], coordinates[1]],
    },
  });
}
