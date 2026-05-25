# Power Atlas

[![CI](https://github.com/teddygcodes/power-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/teddygcodes/power-atlas/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/teddygcodes/power-atlas/blob/main/LICENSE)

**AI Infrastructure Site → Power & Water Visualizer** — a public-data planning simulator.

Power Atlas ingests real OpenStreetMap infrastructure for a region and visualizes **candidate
dependencies** from a hypothetical AI data-center campus to the nearest *plausible* power and
water sources — with rigorously honest data-confidence labeling. It is a visualization and
exploration tool, not an engineering study.

---

## Disclaimer

> Power Atlas uses public and community-sourced infrastructure data for visualization and
> planning exploration. It does not represent official utility capacity, interconnection
> feasibility, engineering approval, or site suitability. All infrastructure dependencies shown
> are candidate/estimated and require professional verification.

---

## What it does (v0.2)

- **Ingests real OSM data** via the Overpass API for a configurable bounding box (default: the
  Atlanta / North Georgia corridor) and writes local GeoJSON. Two layers: **power** (substations,
  transmission lines, power plants) and **water** (named rivers, reservoirs/lakes, streams).
- **Renders** both layers on a dark MapLibre + deck.gl map, with per-layer toggles.
- **Resolves a candidate power dependency and a candidate water dependency** for a campus location
  + size (50 / 100 / 250 / 500 MW): the nearest *plausible* source, reporting distance, the source
  type / raw voltage, a load class, reason codes, and caveats.
- **Load-aware plausibility:** a large campus prefers a transmission-voltage substation over a
  closer low-voltage one, and a major river/reservoir over a closer minor stream — but a
  less-suitable source is never hidden; it is surfaced and flagged.
- **Click to reposition** the campus and switch size; resolvers, HUDs, and candidate paths update
  live.
- **Surfaces provenance** in an Ingestion Center (`/data`): source-manifest counts, bbox, last
  sync, and per-layer warnings + limitations.

## What it does NOT do

Cooling, flood risk, construction timeline, stress scenarios, 3D campus assets, or full
digital-twin modes. It does **not** model connectivity, capacity, interconnection feasibility, or
water rights — and never claims to. There is no live Overpass call from the browser.

---

## Install

Requires Node 18+ (developed on Node 24).

```bash
npm install
```

The default `georgia-demo` dataset (power + water GeoJSON) is **committed to the repo on
purpose**, so the app runs immediately after install — no ingestion needed to see the map.

## Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # unit tests (vitest)
npm run coverage   # coverage report (no threshold gate)
```

Tests cover the pure core — the power and water resolvers, voltage/water classing, polygon
centroid, nearest-feature search, load classes, and warnings — against **real-data fixtures**, and
run in CI on every push.

## Ingestion

```bash
npm run ingest:region                          # power + water, default region georgia-demo
npm run ingest:osm-power                        # power only
npm run ingest:osm-water                        # water only
npm run ingest:region -- --region=my-area --bbox=33.4,-84.8,34.3,-83.8
```

`--bbox` is ordered **south,west,north,east** (the Overpass area-filter order). Ingestion writes to
`public/geojson/<region>/`: `substations.geojson`, `transmission-lines.geojson`,
`power-plants.geojson` (plants + generators, context only), `water.geojson`, and a merged
`source-manifest.json`. Raw Overpass dumps go to `data/raw/<region>/` (gitignored). Water ingests
**named features only** (rivers / reservoirs / streams), dropping the large unnamed pond/ditch
tail. To point the UI at a different region, change `REGION` in `components/PowerAtlasApp.tsx`.

> **Note:** Overpass rejects the default HTTP-client User-Agent with `406 Not Acceptable`; the
> client sends an explicit identifying User-Agent (also Overpass usage-policy etiquette). If the
> ingest fails with an `unreachable` error, your environment is blocking outbound access to
> `overpass-api.de` — run the script somewhere with access and copy the GeoJSON into
> `public/geojson/<region>/`.

---

## Why Overpass is scripts-only

The Overpass API is a heavy, rate-limited public service. It must never be called from the browser.
In Power Atlas:

- The Overpass client (`lib/ingestion/osm/overpassClient.ts`) and the filesystem writers
  (`lib/storage/localGeoJsonStore.ts`) import `lib/serverOnly.ts`, which **throws if evaluated in a
  browser context**. If ingestion code is ever accidentally imported into a client component, the
  build breaks loudly instead of silently shipping node-only code (and its deps) to the client.
- The browser only ever `fetch`es the **local** GeoJSON files from `public/`.
- Shared logic in `lib/geo/*`, `lib/power/*`, and `lib/water/*` is pure and isomorphic (no
  node-only imports), so it runs in both the ingest script and the browser without modification.

Verified at build time: `overpass-api.de` and `osmtogeojson` do not appear in the client bundle.

---

## Data-confidence model

Power Atlas is deliberate about how confident it is, and says so everywhere. Every dependency
carries:

| Field | Value | Meaning |
|---|---|---|
| **Source confidence** | `community` | Community-sourced OSM data, which may be incomplete. |
| **Path confidence** | `derived` | The candidate path is computed from proximity, not measured. |
| **Capacity status** | `unknown` | Capacity is never inferred or claimed. |

**Resolution — load-aware plausibility (the same shape for both layers).** Candidates are ranked by
a qualitative class **then distance** — `plausible > unknown (data gap) > insufficient-for-load` —
picking the nearest within the top tier. A less-suitable source is **never excluded**; it is
surfaced with a warning.

- **Power** classes the raw `voltage` tag (transmission / sub-transmission / distribution). The raw
  string is preserved **verbatim** (`115000`, `115kV`, `115000;46000`) and never parsed for display.
  Power plants and generators are context only, never resolver inputs.
- **Water** classes type (major river / reservoir-lake / minor stream). No flow or capacity numbers
  are ever produced.
- **Water demand is keyed off campus MW as a rough proxy only** — cooling is not modeled in v0.2;
  treat MW→water as a placeholder, not a real relationship.

**Representative coordinates:** polygons (most substations, reservoirs) use the area-weighted
centroid of the exterior ring; lines (transmission, rivers, streams) use a midpoint; points use
themselves.

---

## Limitations

- OSM infrastructure data is community-sourced and may be incomplete.
- **Proximity does not imply connectivity (power) or water rights / withdrawal capacity (water).**
  The nearest visible source may not be the real interconnection or supply point.
- Capacity is unknown unless verified by a utility or official study.
- Voltage tags may be missing, unit-inconsistent, or multi-valued; water ingests named features only.
- Coverage is limited to the queried bounding box.
- The basemap loads free CARTO vector tiles at runtime (requires internet in the browser); the
  infrastructure data itself is always local.

---

## Project structure

```
app/                      Next.js App Router pages (/ and /data)
components/
  map/                    PowerAtlasMap + power & water deck.gl layers, candidate paths, toggles
  power/                  ScenarioPanel, PowerHUD, DependencyWarnings
  water/                  WaterHUD
  data/                   IngestionCenter, SourceStatusCard, DataLimitationsPanel
  ui/                     Panel, Badge, MetricRow
lib/
  ingestion/osm/          Overpass query builder, client (server-only), power + water normalizers
  geo/                    distance, centroid, nearest, bbox, geojson  (pure / isomorphic)
  power/                  voltageClass, loadClasses, dependencyResolver, powerWarnings
  water/                  waterClass, waterResolver, waterWarnings
  storage/                local GeoJSON writers (server-only), manifest builder
  serverOnly.ts           browser-bundle guard
scripts/                  ingest-osm-power.ts, ingest-osm-water.ts
types/                    infrastructure, water, geojson, scenario, dependency, ingestion
tests/                    vitest specs + real-data fixtures
public/geojson/<region>/  generated GeoJSON + source manifest
```

Contributing with an AI agent? See [CLAUDE.md](CLAUDE.md) for how to work in this repo.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · MapLibre GL · react-map-gl ·
deck.gl 9 · osmtogeojson · axios · tsx · Vitest.
