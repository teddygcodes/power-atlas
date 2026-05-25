"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import type {
  PowerFeatureCollection,
  WaterFeatureCollection,
  FloodFeatureCollection,
} from "../types/geojson";
import {
  emptyFeatureCollection,
  emptyWaterFeatureCollection,
  emptyFloodFeatureCollection,
} from "../types/geojson";
import type { CampusSizeMW, CoolingType } from "../types/scenario";
import type { BuildPhase } from "../types/timeline";
import { fetchFeatureCollection } from "../lib/geo/geojson";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { resolveCandidateWaterDependency } from "../lib/water/waterResolver";
import { resolveCampusFloodRisk } from "../lib/flood/floodResolver";
import {
  explainPower,
  explainWater,
  explainFlood,
  findFeatureRawTags,
} from "../lib/explain/explain";
import type { LayerVisibility } from "./map/PowerInfrastructureLayer";
import { LayerTogglePanel } from "./map/LayerTogglePanel";
import { ScenarioPanel } from "./power/ScenarioPanel";
import { PowerHUD } from "./power/PowerHUD";
import { DependencyWarnings } from "./power/DependencyWarnings";
import { WaterHUD } from "./water/WaterHUD";
import { FloodHUD } from "./flood/FloodHUD";
import { PhaseTimeline } from "./timeline/PhaseTimeline";
import { ExplainDrawer } from "./explain/ExplainDrawer";
import { screenRegion, SCREENING_CAVEAT } from "../lib/screening/screen";
import { ScreeningDrawer } from "./screening/ScreeningDrawer";
import { ScreeningCaveatBanner } from "./screening/ScreeningCaveatBanner";
import { DataConfidenceLegend } from "./ui/DataConfidenceLegend";

// Map is WebGL/maplibre — render client-only to avoid SSR window access.
const PowerAtlasMap = dynamic(() => import("./map/PowerAtlasMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-atlas-muted">
      Loading map…
    </div>
  ),
});

// 3D campus massing is WebGL (react-three-fiber) — client-only, lazy-loaded so three
// stays out of the initial/server bundle.
const Campus3D = dynamic(() => import("./campus/Campus3D"), { ssr: false });

const REGION = "georgia-demo";
const DEFAULT_CAMPUS: [number, number] = [-84.388, 33.749];

interface Collections {
  substations?: PowerFeatureCollection;
  transmissionLines?: PowerFeatureCollection;
  powerPlants?: PowerFeatureCollection;
  water?: WaterFeatureCollection;
  flood?: FloodFeatureCollection;
}

export function PowerAtlasApp() {
  const [campusSizeMW, setCampusSizeMW] = useState<CampusSizeMW>(100);
  const [coolingType, setCoolingType] = useState<CoolingType>("hybrid");
  const [campus, setCampus] = useState<[number, number]>(DEFAULT_CAMPUS);
  const [visibility, setVisibility] = useState<LayerVisibility>({
    substations: true,
    transmission: true,
    plants: false,
    candidatePath: true,
    // Water + flood default OFF; their GeoJSON is fetched lazily on first toggle-on.
    water: false,
    waterPath: false,
    flood: false,
    // Grid screening default OFF; enabling it lazily loads water + flood too.
    screening: false,
  });
  // Construction-timeline phase. Default "operational" = every campus feature
  // revealed, so first paint is identical to the un-timelined app; scrubbing back
  // only HIDES the campus's build features (display gate, no recompute).
  const [buildPhase, setBuildPhase] = useState<BuildPhase>("operational");
  // 3D campus massing inset — additive cosmetic overlay, default visible.
  const [show3D, setShow3D] = useState(true);
  // Explainability drawer: which layer's existing output to surface (read-only).
  const [explainTarget, setExplainTarget] = useState<"power" | "water" | "flood" | null>(null);
  // Site-screening: which grid cell's per-dimension breakdown is open (read-only).
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [data, setData] = useState<Collections>({});
  const [error, setError] = useState<string | null>(null);
  const requested = useRef<Set<string>>(new Set());

  // On-demand, cached fetch: core power loads on mount (the default primary
  // view); power plants + water load only when their layer is first enabled.
  useEffect(() => {
    const base = `/geojson/${REGION}`;
    const seen = requested.current;
    if (!seen.has("core")) {
      seen.add("core");
      Promise.all([
        fetchFeatureCollection(`${base}/substations.geojson`),
        fetchFeatureCollection(`${base}/transmission-lines.geojson`),
      ])
        .then(([substations, transmissionLines]) =>
          setData((d) => ({ ...d, substations, transmissionLines })),
        )
        .catch((e) => setError(String(e)));
    }
    if (visibility.plants && !seen.has("plants")) {
      seen.add("plants");
      fetchFeatureCollection(`${base}/power-plants.geojson`)
        .then((powerPlants) => setData((d) => ({ ...d, powerPlants })))
        .catch((e) => console.error("power-plants load failed", e));
    }
    // Screening needs all four datasets, so it also triggers the water + flood loads.
    if (
      (visibility.water || visibility.waterPath || visibility.screening) &&
      !seen.has("water")
    ) {
      seen.add("water");
      fetchFeatureCollection(`${base}/water.geojson`)
        .then((fc) =>
          setData((d) => ({ ...d, water: fc as unknown as WaterFeatureCollection })),
        )
        .catch((e) => console.error("water load failed", e));
    }
    if ((visibility.flood || visibility.screening) && !seen.has("flood")) {
      seen.add("flood");
      fetchFeatureCollection(`${base}/flood-zones.geojson`)
        .then((fc) =>
          setData((d) => ({ ...d, flood: fc as unknown as FloodFeatureCollection })),
        )
        .catch((e) => console.error("flood load failed", e));
    }
  }, [visibility]);

  // One scenario feeds both resolvers. coolingType refines WATER demand only —
  // the power resolver ignores it (cooling does not affect power in this model).
  const scenario = useMemo(
    () => ({ campusSizeMW, coordinates: campus, coolingType }),
    [campusSizeMW, campus, coolingType],
  );

  const dependency = useMemo(() => {
    if (!data.substations || !data.transmissionLines) return null;
    return resolveCandidatePowerDependency({
      scenario,
      substations: data.substations,
      transmissionLines: data.transmissionLines,
    });
  }, [data.substations, data.transmissionLines, scenario]);

  const waterDependency = useMemo(() => {
    if (!data.water) return null;
    return resolveCandidateWaterDependency({ scenario, waterFeatures: data.water });
  }, [data.water, scenario]);

  // Flood is a site-risk constraint resolved from the campus coordinate. It does
  // NOT interact with power / water / cooling in v0.4.
  const floodRisk = useMemo(() => {
    if (!data.flood) return null;
    return resolveCampusFloodRisk({ scenario, floodZones: data.flood });
  }, [data.flood, scenario]);

  // Read-only explainability model for the open drawer. Surfaces EXISTING resolver
  // output (+ verbatim rawTags looked up by featureId) — it computes nothing new.
  const explainModel = useMemo(() => {
    if (explainTarget === "power" && dependency) {
      const rawTags =
        findFeatureRawTags(data.substations, dependency.featureId) ??
        findFeatureRawTags(data.transmissionLines, dependency.featureId) ??
        findFeatureRawTags(data.powerPlants, dependency.featureId);
      return explainPower(dependency, rawTags);
    }
    if (explainTarget === "water" && waterDependency) {
      return explainWater(
        waterDependency,
        findFeatureRawTags(data.water, waterDependency.featureId),
      );
    }
    if (explainTarget === "flood" && floodRisk) {
      return explainFlood(floodRisk);
    }
    return null;
  }, [explainTarget, dependency, waterDependency, floodRisk, data]);

  // Site-screening runs the EXISTING resolvers over a coarse grid for the current
  // MW + cooling, on demand. Null until enabled AND all four datasets are loaded.
  const screeningResult = useMemo(() => {
    if (!visibility.screening) return null;
    if (!data.substations || !data.transmissionLines || !data.water || !data.flood) {
      return null;
    }
    return screenRegion({
      campusSizeMW,
      coolingType,
      substations: data.substations,
      transmissionLines: data.transmissionLines,
      water: data.water,
      flood: data.flood,
    });
  }, [
    visibility.screening,
    campusSizeMW,
    coolingType,
    data.substations,
    data.transmissionLines,
    data.water,
    data.flood,
  ]);

  // Close the screening cell drawer whenever screening is turned off.
  useEffect(() => {
    if (!visibility.screening) setSelectedCell(null);
  }, [visibility.screening]);

  const toggleLayer = useCallback((key: keyof LayerVisibility) => {
    setVisibility((v) => ({ ...v, [key]: !v[key] }));
  }, []);

  const isDefaultCampus =
    campus[0] === DEFAULT_CAMPUS[0] && campus[1] === DEFAULT_CAMPUS[1];

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-atlas-border px-4 py-2.5">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-atlas-text">
            Power Atlas
          </h1>
          <p className="text-[11px] text-atlas-muted">
            AI data-center site → power, water &amp; risk visualizer
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden max-w-md text-right text-[10px] leading-tight text-atlas-dim md:block">
            Public-data planning simulator. Not an official utility capacity or
            interconnection study.
          </p>
          <Link
            href="/data"
            className="rounded border border-atlas-border px-2 py-1 text-[11px] text-atlas-muted hover:text-atlas-text"
          >
            Ingestion Center
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 space-y-3 overflow-y-auto border-r border-atlas-border p-3">
          <ScenarioPanel
            campusSizeMW={campusSizeMW}
            onSizeChange={setCampusSizeMW}
            coolingType={coolingType}
            onCoolingChange={setCoolingType}
            campus={campus}
            isDefaultCampus={isDefaultCampus}
            onReset={() => setCampus(DEFAULT_CAMPUS)}
          />
          <LayerTogglePanel visibility={visibility} onToggle={toggleLayer} />
          <DataConfidenceLegend />
        </aside>

        <div className="relative min-w-0 flex-1 bg-atlas-bg">
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-sm text-signal-candidate">
                  Failed to load local power data.
                </p>
                <p className="mt-1 max-w-md text-xs text-atlas-muted">
                  {error}. Run{" "}
                  <code className="font-mono">npm run ingest:osm-power</code> to
                  generate GeoJSON in public/geojson/{REGION}/.
                </p>
              </div>
            </div>
          ) : data.substations && data.transmissionLines ? (
            <>
              <PowerAtlasMap
                substations={data.substations}
                transmissionLines={data.transmissionLines}
                powerPlants={data.powerPlants ?? emptyFeatureCollection()}
                water={data.water ?? emptyWaterFeatureCollection()}
                floodZones={data.flood ?? emptyFloodFeatureCollection()}
                campus={campus}
                campusSizeMW={campusSizeMW}
                dependency={dependency}
                waterDependency={waterDependency}
                visibility={visibility}
                buildPhase={buildPhase}
                screeningResult={screeningResult}
                selectedCell={selectedCell}
                onPickCampus={setCampus}
                onPickCell={setSelectedCell}
              />
              {visibility.screening && (
                <ScreeningCaveatBanner caveat={SCREENING_CAVEAT} />
              )}
              <PhaseTimeline phase={buildPhase} onChange={setBuildPhase} />
              {show3D ? (
                <Campus3D phase={buildPhase} onClose={() => setShow3D(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShow3D(true)}
                  className="absolute right-4 top-4 z-10 rounded-lg border border-atlas-border bg-atlas-panel/95 px-2.5 py-1.5 text-[11px] text-atlas-muted shadow-lg backdrop-blur hover:text-atlas-text"
                >
                  Campus 3D
                </button>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-atlas-muted">
              Loading power infrastructure…
            </div>
          )}
        </div>

        <aside className="w-80 shrink-0 space-y-3 overflow-y-auto border-l border-atlas-border p-3">
          <PowerHUD
            dependency={dependency}
            campusSizeMW={campusSizeMW}
            onExplain={() => setExplainTarget("power")}
          />
          {dependency && <DependencyWarnings warnings={dependency.warnings} />}
          <WaterHUD
            dependency={waterDependency}
            coolingType={coolingType}
            onExplain={() => setExplainTarget("water")}
          />
          <FloodHUD risk={floodRisk} onExplain={() => setExplainTarget("flood")} />
        </aside>
      </div>

      {explainModel && (
        <ExplainDrawer model={explainModel} onClose={() => setExplainTarget(null)} />
      )}

      {screeningResult &&
        selectedCell != null &&
        selectedCell < screeningResult.cells.length && (
          <ScreeningDrawer
            cell={screeningResult.cells[selectedCell]}
            caveat={screeningResult.caveat}
            onClose={() => setSelectedCell(null)}
          />
        )}
    </div>
  );
}
