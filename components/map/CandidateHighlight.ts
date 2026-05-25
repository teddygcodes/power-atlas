import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { COLORS } from "./PowerInfrastructureLayer";

interface RingDatum {
  position: [number, number];
}

// Static ring halo + label around the SELECTED power candidate so it reads
// instantly on a screenshot. Purely visual emphasis — no quantitative meaning.
// (Static, not animated: a pulse doesn't survive a screenshot and costs frames.)
export function buildCandidateHighlightLayers(params: {
  candidate: [number, number];
}): Layer[] {
  const data: RingDatum[] = [{ position: params.candidate }];
  const trigger = [params.candidate[0], params.candidate[1]];

  const ring = (id: string, radius: number, alpha: number, width: number): Layer =>
    new ScatterplotLayer<RingDatum>({
      id,
      data,
      getPosition: (d) => d.position,
      stroked: true,
      filled: false,
      getLineColor: [...COLORS.candidate, alpha],
      getLineWidth: width,
      lineWidthUnits: "pixels",
      lineWidthMinPixels: width,
      getRadius: radius,
      radiusUnits: "pixels",
      radiusMinPixels: radius,
      radiusMaxPixels: radius,
      pickable: false,
      updateTriggers: { getPosition: trigger },
    });

  return [
    ring("candidate-halo-outer", 22, 110, 1.5),
    ring("candidate-halo-inner", 14, 220, 2),
    new TextLayer<RingDatum>({
      id: "candidate-label",
      data,
      getPosition: (d) => d.position,
      getText: () => "Candidate dependency",
      getColor: [...COLORS.candidate, 255],
      getSize: 12,
      sizeUnits: "pixels",
      getPixelOffset: [0, -30],
      getTextAnchor: "middle",
      getAlignmentBaseline: "bottom",
      fontFamily: "ui-monospace, monospace",
      fontWeight: 600,
      background: true,
      getBackgroundColor: [10, 14, 20, 200],
      backgroundPadding: [4, 2],
      pickable: false,
      updateTriggers: { getPosition: trigger },
    }),
  ];
}
