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
  50: { width: 3, color: [255, 168, 120, 220] },
  100: { width: 4.5, color: [255, 138, 100, 240] },
  250: { width: 6.5, color: [255, 104, 84, 255] },
  500: { width: 9, color: [255, 74, 78, 255] },
};

// Returns the candidate path as a translucent wider underlay + the bright main
// line, so the resolved dependency reads strongly on a screenshot.
export function buildCandidatePathLayer(params: {
  campus: [number, number];
  candidate: [number, number];
  campusSizeMW: CampusSizeMW;
}): Layer[] {
  const style = INTENSITY[params.campusSizeMW];
  const data = [{ from: params.campus, to: params.candidate }];
  const triggers = {
    getColor: params.campusSizeMW,
    getWidth: params.campusSizeMW,
    getSourcePosition: [params.campus[0], params.campus[1]],
    getTargetPosition: [params.candidate[0], params.candidate[1]],
  };
  return [
    new LineLayer<PathDatum>({
      id: "candidate-power-path-underlay",
      data,
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getColor: [style.color[0], style.color[1], style.color[2], 70],
      getWidth: style.width * 2.5,
      widthUnits: "pixels",
      widthMinPixels: 4,
      pickable: false,
      updateTriggers: triggers,
    }),
    new LineLayer<PathDatum>({
      id: "candidate-power-path",
      data,
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getColor: style.color,
      getWidth: style.width,
      widthUnits: "pixels",
      widthMinPixels: 2.5,
      pickable: false,
      updateTriggers: triggers,
    }),
  ];
}
