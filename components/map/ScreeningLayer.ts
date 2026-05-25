import { PolygonLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import type { ScreeningCell, ScreeningResult } from "../../types/screening";

// signal.screening — a NEUTRAL teal, deliberately not traffic-light green.
const TEAL = [86, 182, 194] as [number, number, number];
const DIM = [90, 102, 117] as [number, number, number];

interface CellDatum {
  cell: ScreeningCell;
  index: number;
}

// Grid cells colored by worth-investigating vs not — a two-state highlight, never a
// ranked heatmap. The per-dimension "why" lives in the drawer (click a cell).
export function buildScreeningLayers(params: {
  result: ScreeningResult | null;
  visible: boolean;
  selectedIndex: number | null;
}): Layer[] {
  if (!params.visible || !params.result) return [];
  const data: CellDatum[] = params.result.cells.map((cell, index) => ({ cell, index }));
  return [
    new PolygonLayer<CellDatum>({
      id: "screening-grid",
      data,
      getPolygon: (d) => d.cell.polygon as unknown as number[][],
      filled: true,
      getFillColor: (d) =>
        d.cell.worthInvestigating ? [...TEAL, 70] : [...DIM, 16],
      stroked: true,
      getLineColor: (d) =>
        d.index === params.selectedIndex
          ? [255, 255, 255, 220]
          : d.cell.worthInvestigating
            ? [...TEAL, 180]
            : [...DIM, 60],
      lineWidthUnits: "pixels",
      getLineWidth: (d) => (d.index === params.selectedIndex ? 2 : 1),
      lineWidthMinPixels: 1,
      pickable: true,
      updateTriggers: {
        getLineColor: params.selectedIndex,
        getLineWidth: params.selectedIndex,
      },
    }),
  ];
}
