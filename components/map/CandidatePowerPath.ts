import { LineLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { CampusSizeMW } from "../../types/scenario";

interface PathDatum {
  from: [number, number];
  to: [number, number];
}

// Intensity by campus size: calm (50MW) → extreme (500MW). Visual emphasis
// only — this is an ESTIMATED candidate path, never an actual connection.
const INTENSITY: Record<
  CampusSizeMW,
  { width: number; color: [number, number, number, number] }
> = {
  50: { width: 2, color: [255, 168, 120, 170] },
  100: { width: 3.5, color: [255, 138, 100, 200] },
  250: { width: 5.5, color: [255, 104, 84, 225] },
  500: { width: 8, color: [255, 74, 78, 245] },
};

export function buildCandidatePathLayer(params: {
  campus: [number, number];
  candidate: [number, number];
  campusSizeMW: CampusSizeMW;
}): Layer {
  const style = INTENSITY[params.campusSizeMW];
  return new LineLayer<PathDatum>({
    id: "candidate-power-path",
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
