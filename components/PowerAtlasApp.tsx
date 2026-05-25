"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import type { PowerFeatureCollection, WaterFeatureCollection } from "../types/geojson";
import { emptyFeatureCollection, emptyWaterFeatureCollection } from "../types/geojson";
import type { CampusSizeMW } from "../types/scenario";
import { fetchFeatureCollection } from "../lib/geo/geojson";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { resolveCandidateWaterDependency } from "../lib/water/waterResolver";
import type { LayerVisibility } from "./map/PowerInfrastructureLayer";
import { LayerTogglePanel } from "./map/LayerTogglePanel";
import { ScenarioPanel } from "./power/ScenarioPanel";
import { PowerHUD } from "./power/PowerHUD";
import { DependencyWarnings } from "./power/DependencyWarnings";
import { WaterHUD } from "./water/WaterHUD";

// Map is WebGL/maplibre — render client-only to avoid SSR window access.
const PowerAtlasMap = dynamic(() => import("./map/PowerAtlasMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-atlas-muted">
      Loading map…
    </div>
  ),
});

const REGION = "georgia-demo";
const DEFAULT_CAMPUS: [number, number] = [-84.388, 33.749];

interface Collections {
  substations?: PowerFeatureCollection;
  transmissionLines?: PowerFeatureCollection;
  powerPlants?: PowerFeatureCollection;
  water?: WaterFeatureCollection;
}

export function PowerAtlasApp() {
  const [campusSizeMW, setCampusSizeMW] = useState<CampusSizeMW>(100);
  const [campus, setCampus] = useState<[number, number]>(DEFAULT_CAMPUS);
  const [visibility, setVisibility] = useState<LayerVisibility>({
    substations: true,
    transmission: true,
    plants: false,
    candidatePath: true,
    // Water defaults OFF; its ~10 MB GeoJSON is fetched lazily on first toggle-on.
    water: false,
    waterPath: false,
  });
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
    if ((visibility.water || visibility.waterPath) && !seen.has("water")) {
      seen.add("water");
      fetchFeatureCollection(`${base}/water.geojson`)
        .then((fc) =>
          setData((d) => ({ ...d, water: fc as unknown as WaterFeatureCollection })),
        )
        .catch((e) => console.error("water load failed", e));
    }
  }, [visibility]);

  const dependency = useMemo(() => {
    if (!data.substations || !data.transmissionLines) return null;
    return resolveCandidatePowerDependency({
      scenario: { campusSizeMW, coordinates: campus },
      substations: data.substations,
      transmissionLines: data.transmissionLines,
    });
  }, [data.substations, data.transmissionLines, campusSizeMW, campus]);

  const waterDependency = useMemo(() => {
    if (!data.water) return null;
    return resolveCandidateWaterDependency({
      scenario: { campusSizeMW, coordinates: campus },
      waterFeatures: data.water,
    });
  }, [data.water, campusSizeMW, campus]);

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
            AI Infrastructure Site → Power Visualizer
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
            campus={campus}
            isDefaultCampus={isDefaultCampus}
            onReset={() => setCampus(DEFAULT_CAMPUS)}
          />
          <LayerTogglePanel visibility={visibility} onToggle={toggleLayer} />
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
            <PowerAtlasMap
              substations={data.substations}
              transmissionLines={data.transmissionLines}
              powerPlants={data.powerPlants ?? emptyFeatureCollection()}
              water={data.water ?? emptyWaterFeatureCollection()}
              campus={campus}
              campusSizeMW={campusSizeMW}
              dependency={dependency}
              waterDependency={waterDependency}
              visibility={visibility}
              onPickCampus={setCampus}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-atlas-muted">
              Loading power infrastructure…
            </div>
          )}
        </div>

        <aside className="w-80 shrink-0 space-y-3 overflow-y-auto border-l border-atlas-border p-3">
          <PowerHUD dependency={dependency} campusSizeMW={campusSizeMW} />
          {dependency && <DependencyWarnings warnings={dependency.warnings} />}
          <WaterHUD dependency={waterDependency} />
        </aside>
      </div>
    </div>
  );
}
