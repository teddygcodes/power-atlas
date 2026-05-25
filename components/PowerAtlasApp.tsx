"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import type { PowerFeatureCollection, WaterFeatureCollection } from "../types/geojson";
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

interface LoadedData {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
  powerPlants: PowerFeatureCollection;
  water: WaterFeatureCollection;
}

export function PowerAtlasApp() {
  const [campusSizeMW, setCampusSizeMW] = useState<CampusSizeMW>(100);
  const [campus, setCampus] = useState<[number, number]>(DEFAULT_CAMPUS);
  const [visibility, setVisibility] = useState<LayerVisibility>({
    substations: true,
    transmission: true,
    plants: false,
    candidatePath: true,
    water: true,
    waterPath: true,
  });
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const base = `/geojson/${REGION}`;
    Promise.all([
      fetchFeatureCollection(`${base}/substations.geojson`),
      fetchFeatureCollection(`${base}/transmission-lines.geojson`),
      fetchFeatureCollection(`${base}/power-plants.geojson`),
      fetchFeatureCollection(`${base}/water.geojson`),
    ])
      .then(([substations, transmissionLines, powerPlants, water]) => {
        if (active)
          setData({
            substations,
            transmissionLines,
            powerPlants,
            // Structurally identical FeatureCollection; properties differ.
            water: water as unknown as WaterFeatureCollection,
          });
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, []);

  const dependency = useMemo(() => {
    if (!data) return null;
    return resolveCandidatePowerDependency({
      scenario: { campusSizeMW, coordinates: campus },
      substations: data.substations,
      transmissionLines: data.transmissionLines,
    });
  }, [data, campusSizeMW, campus]);

  const waterDependency = useMemo(() => {
    if (!data) return null;
    return resolveCandidateWaterDependency({
      scenario: { campusSizeMW, coordinates: campus },
      waterFeatures: data.water,
    });
  }, [data, campusSizeMW, campus]);

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
          ) : data ? (
            <PowerAtlasMap
              substations={data.substations}
              transmissionLines={data.transmissionLines}
              powerPlants={data.powerPlants}
              water={data.water}
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
