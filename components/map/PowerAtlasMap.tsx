"use client";

import { useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import type { Layer, PickingInfo, MapViewState } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import type {
  PowerFeatureCollection,
  PowerFeature,
  WaterFeatureCollection,
  FloodFeatureCollection,
} from "../../types/geojson";
import type { CampusSizeMW } from "../../types/scenario";
import type { CandidatePowerDependency } from "../../types/dependency";
import type { CandidateWaterDependency } from "../../types/water";
import type { BuildPhase } from "../../types/timeline";
import { revealForPhase } from "../../lib/timeline/phases";
import {
  buildInfrastructureLayers,
  type LayerVisibility,
} from "./PowerInfrastructureLayer";
import { buildWaterLayers } from "./WaterInfrastructureLayer";
import { buildFloodLayers } from "./FloodLayer";
import { buildCampusLayer } from "./CampusMarker";
import { buildCandidatePathLayer } from "./CandidatePowerPath";
import { buildCandidateWaterPath } from "./CandidateWaterPath";

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
  water,
  floodZones,
  campus,
  campusSizeMW,
  dependency,
  waterDependency,
  visibility,
  buildPhase,
  onPickCampus,
}: {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
  powerPlants: PowerFeatureCollection;
  water: WaterFeatureCollection;
  floodZones: FloodFeatureCollection;
  campus: [number, number];
  campusSizeMW: CampusSizeMW;
  dependency: CandidatePowerDependency | null;
  waterDependency: CandidateWaterDependency | null;
  visibility: LayerVisibility;
  buildPhase: BuildPhase;
  onPickCampus: (coords: [number, number]) => void;
}) {
  const layers = useMemo<Layer[]>(() => {
    // The timeline only sequences the REVEAL of the campus's own build features
    // (campus marker + the two candidate paths). It never recomputes anything; at
    // the "operational" phase every flag is true, so the view equals the un-timelined
    // app. The background world below follows its user toggles, unphased.
    const reveal = revealForPhase(buildPhase);

    // Water + flood (area layers) underneath the point/line infrastructure.
    const ls: Layer[] = buildWaterLayers({
      water,
      visible: visibility.water,
      candidateFeatureId: waterDependency?.featureId,
    });
    ls.push(...buildFloodLayers({ flood: floodZones, visible: visibility.flood }));
    ls.push(
      ...buildInfrastructureLayers({
        substations,
        transmissionLines,
        powerPlants,
        visibility,
        candidateFeatureId: dependency?.featureId,
      }),
    );
    if (visibility.candidatePath && dependency && reveal.candidatePowerPath) {
      ls.push(
        buildCandidatePathLayer({
          campus,
          candidate: dependency.candidateCoordinates,
          campusSizeMW,
        }),
      );
    }
    if (visibility.waterPath && waterDependency && reveal.candidateWaterPath) {
      ls.push(
        buildCandidateWaterPath({
          campus,
          candidate: waterDependency.candidateCoordinates,
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
    water,
    floodZones,
    visibility,
    dependency,
    waterDependency,
    campus,
    campusSizeMW,
    buildPhase,
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
