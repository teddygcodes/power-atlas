"use client";

import { useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import type { Layer, PickingInfo, MapViewState } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import type { PowerFeatureCollection, PowerFeature } from "../../types/geojson";
import type { CampusSizeMW } from "../../types/scenario";
import type { CandidatePowerDependency } from "../../types/dependency";
import {
  buildInfrastructureLayers,
  type LayerVisibility,
} from "./PowerInfrastructureLayer";
import { buildCampusLayer } from "./CampusMarker";
import { buildCandidatePathLayer } from "./CandidatePowerPath";

// Free CARTO dark basemap — no API token required. Renders external vector
// tiles at runtime in the browser. The power infrastructure (deck.gl layers)
// is always drawn from LOCAL GeoJSON regardless of basemap availability.
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: -84.388,
  latitude: 33.749,
  zoom: 9,
  pitch: 0,
  bearing: 0,
};

interface PointObject {
  feature: PowerFeature;
}

function renderTooltip(info: PickingInfo) {
  const obj = info.object as PointObject | undefined;
  if (!obj?.feature) return null;
  const p = obj.feature.properties;
  const lines = [
    p.name ?? "(unnamed)",
    `type: ${p.type}`,
    `voltage (raw): ${p.voltage ?? "missing"}`,
    `source: OSM · community`,
    `capacity: unknown`,
  ];
  return {
    text: lines.join("\n"),
    style: {
      backgroundColor: "#11161f",
      color: "#d6dde6",
      fontSize: "11px",
      fontFamily: "ui-monospace, monospace",
      border: "1px solid #222c3a",
      borderRadius: "4px",
      padding: "6px 8px",
      whiteSpace: "pre",
    },
  };
}

export default function PowerAtlasMap({
  substations,
  transmissionLines,
  powerPlants,
  campus,
  campusSizeMW,
  dependency,
  visibility,
  onPickCampus,
}: {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
  powerPlants: PowerFeatureCollection;
  campus: [number, number];
  campusSizeMW: CampusSizeMW;
  dependency: CandidatePowerDependency | null;
  visibility: LayerVisibility;
  onPickCampus: (coords: [number, number]) => void;
}) {
  const layers = useMemo<Layer[]>(() => {
    const ls = buildInfrastructureLayers({
      substations,
      transmissionLines,
      powerPlants,
      visibility,
      candidateFeatureId: dependency?.featureId,
    });
    if (visibility.candidatePath && dependency) {
      ls.push(
        buildCandidatePathLayer({
          campus,
          candidate: dependency.candidateCoordinates,
          campusSizeMW,
        }),
      );
    }
    ls.push(buildCampusLayer(campus));
    return ls;
  }, [
    substations,
    transmissionLines,
    powerPlants,
    visibility,
    dependency,
    campus,
    campusSizeMW,
  ]);

  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (info.coordinate) {
        onPickCampus([info.coordinate[0], info.coordinate[1]]);
      }
    },
    [onPickCampus],
  );

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller
      layers={layers}
      onClick={handleClick}
      getCursor={() => "crosshair"}
      getTooltip={renderTooltip}
    >
      <Map mapStyle={DARK_STYLE} />
    </DeckGL>
  );
}
