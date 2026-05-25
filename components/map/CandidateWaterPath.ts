import { LineLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { CampusSizeMW } from "../../types/scenario";

interface PathDatum {
  from: [number, number];
  to: [number, number];
}

// Distinct blue candidate water path (vs power's red). Intensity by campus size.
// This is an ESTIMATED candidate dependency — never an actual water supply line.
const INTENSITY: Record<CampusSizeMW, { width: number; color: [number, number, number, number] }> = {
  50: { width: 2, color: [127, 210, 255, 170] },
  100: { width: 3, color: [110, 195, 250, 200] },
  250: { width: 4.5, color: [90, 175, 240, 225] },
  500: { width: 6.5, color: [70, 150, 230, 245] },
};

export function buildCandidateWaterPath(params: {
  campus: [number, number];
  candidate: [number, number];
  campusSizeMW: CampusSizeMW;
}): Layer {
  const style = INTENSITY[params.campusSizeMW];
  return new LineLayer<PathDatum>({
    id: "candidate-water-path",
    data: [{ from: params.campus, to: params.candidate }],
    getSourcePosition: (d) => d.from,
    getTargetPosition: (d) => d.to,
    getColor: style.color,
    getWidth: style.width,
    widthUnits: "pixels",
    widthMinPixels: 2,
    pickable: false,
    updateTriggers: {
      getColor: params.campusSizeMW,
      getWidth: params.campusSizeMW,
      getSourcePosition: [params.campus[0], params.campus[1]],
      getTargetPosition: [params.candidate[0], params.candidate[1]],
    },
  });
}
