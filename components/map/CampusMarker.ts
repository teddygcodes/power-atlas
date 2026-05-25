import { ScatterplotLayer, IconLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { CampusSizeMW } from "../../types/scenario";

interface CampusDatum {
  position: [number, number];
}

// signal.campus off-white. The marker reads as a SITED facility footprint (a small
// building/site tile), not a generic point, plus a subtle decorative halo and a
// "Proposed {MW}MW Campus" label. The halo carries NO quantitative meaning (it is
// not an impact radius) — purely visual emphasis.
const CAMPUS = [242, 244, 247] as [number, number, number];

// Inline SVG site-tile glyph (2×2 grid) — pixel-stable, no external asset.
const FOOTPRINT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">' +
  '<rect x="7" y="7" width="30" height="30" rx="5" fill="#f2f4f7" stroke="#0a0e14" stroke-width="3"/>' +
  '<line x1="22" y1="9" x2="22" y2="35" stroke="#0a0e14" stroke-width="2"/>' +
  '<line x1="9" y1="22" x2="35" y2="22" stroke="#0a0e14" stroke-width="2"/>' +
  "</svg>";
const FOOTPRINT_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FOOTPRINT_SVG)}`;

export function buildCampusLayers(
  coordinates: [number, number],
  campusSizeMW: CampusSizeMW,
): Layer[] {
  const data: CampusDatum[] = [{ position: coordinates }];
  const trigger = [coordinates[0], coordinates[1]];

  return [
    // Subtle decorative halo (no quantitative meaning).
    new ScatterplotLayer<CampusDatum>({
      id: "campus-halo",
      data,
      getPosition: (d) => d.position,
      stroked: true,
      filled: false,
      getLineColor: [...CAMPUS, 70],
      getLineWidth: 1.5,
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 1.5,
      getRadius: 26,
      radiusUnits: "pixels",
      radiusMinPixels: 26,
      radiusMaxPixels: 26,
      pickable: false,
      updateTriggers: { getPosition: trigger },
    }),
    // Footprint marker (site tile).
    new IconLayer<CampusDatum>({
      id: "campus-footprint",
      data,
      getPosition: (d) => d.position,
      getIcon: () => ({
        url: FOOTPRINT_URL,
        width: 44,
        height: 44,
        anchorX: 22,
        anchorY: 22,
      }),
      getSize: 26,
      sizeUnits: "pixels",
      sizeMinPixels: 22,
      sizeMaxPixels: 34,
      pickable: false,
      updateTriggers: { getPosition: trigger },
    }),
    new TextLayer<CampusDatum>({
      id: "campus-label",
      data,
      getPosition: (d) => d.position,
      getText: () => `Proposed ${campusSizeMW}MW Campus`,
      getColor: [...CAMPUS, 255],
      getSize: 12,
      sizeUnits: "pixels",
      getPixelOffset: [0, 26],
      getTextAnchor: "middle",
      getAlignmentBaseline: "top",
      fontFamily: "ui-monospace, monospace",
      fontWeight: 600,
      background: true,
      getBackgroundColor: [10, 14, 20, 200],
      backgroundPadding: [4, 2],
      pickable: false,
      updateTriggers: { getPosition: trigger, getText: campusSizeMW },
    }),
  ];
}
