# Power Atlas

[![CI](https://github.com/teddygcodes/power-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/teddygcodes/power-atlas/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/teddygcodes/power-atlas/blob/main/LICENSE)

**AI Infrastructure Site → Power Visualizer** — a public-data planning simulator.

Power Atlas ingests real OpenStreetMap power infrastructure (substations, transmission
lines, power plants) for a region and visualizes a **candidate power dependency** from a
hypothetical AI data-center campus to the nearest substation — with rigorously honest
data-confidence labeling. It is a visualization and exploration tool, not an engineering study.

---

## Disclaimer

> Power Atlas uses public and community-sourced infrastructure data for visualization and
> planning exploration. It does not represent official utility capacity, interconnection
> feasibility, engineering approval, or site suitability. All infrastructure dependencies shown
> are candidate/estimated and require professional verification.

---

## What v0.1 does

- **Ingests real OSM power data** via the Overpass API for a configurable bounding box
  (default: the Atlanta / North Georgia corridor) and writes local GeoJSON.
- **Renders** substations, transmission lines, and power plants on a dark MapLibre + deck.gl map.
- **Resolves a candidate power dependency**: given a campus location and size (50 / 100 / 250 /
  500 MW), it finds the **nearest substation** and reports distance, the raw OSM voltage tag,
  a load class, a likely-requirement statement, reason codes, and caveats.
- **Lets you reposition the campus** by clicking the map and switch campus size; the resolver,
  HUD, and candidate path update live.
- **Surfaces provenance** in an Ingestion Center (`/data`) that displays the source manifest:
  counts, bbox, last sync, warnings, and limitations.

## What v0.1 does NOT do

No water, cooling, flood risk, construction timeline, stress scenarios, 3D campus assets, or
full digital-twin modes. It does **not** model grid connectivity, capacity, or interconnection
feasibility, and it never claims to. There is no live Overpass call from the browser.

---

## Install

Requires Node 18+ (developed on Node 24).

```bash
npm install
```

## Run the app

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
npm run typecheck # tsc --noEmit
```

The app reads pre-generated GeoJSON from `public/geojson/<region>/`. The default
`georgia-demo` dataset is **committed to the repo on purpose**, so the app runs immediately
after `npm install` — no ingestion needed to see the map. You only run ingestion to refresh
that data or add a new region. (If a region's data is missing, the map shows a "failed to load
local power data" message.)

## Run ingestion

```bash
npm run ingest:osm-power                      # default region georgia-demo
npm run ingest:osm-power -- --region=my-area --bbox=33.4,-84.8,34.3,-83.8
```

`--bbox` is ordered **south,west,north,east** (the Overpass area-filter order). Ingestion
writes:

- `data/raw/<region>/osm-power-raw.json` — the raw Overpass dump (git-ignored; regenerable)
- `public/geojson/<region>/substations.geojson`
- `public/geojson/<region>/transmission-lines.geojson`
- `public/geojson/<region>/power-plants.geojson` — plants **and** generators (context only)
- `public/geojson/<region>/source-manifest.json`

The script prints file sizes, counts, voltage coverage, and a sample feature from each layer
so you can sanity-check the pull. To point the UI at a different region, change `REGION` in
`components/PowerAtlasApp.tsx` (v0.1 ships a single hard-wired region).

> **Note:** Overpass rejects the default HTTP client User-Agent with `406 Not Acceptable`; the
> client sends an explicit identifying User-Agent (also Overpass usage-policy etiquette). If the
> ingest fails with an `unreachable` error, your environment is blocking outbound access to
> `overpass-api.de` — run the script somewhere with access and copy the GeoJSON into
> `public/geojson/<region>/`.

---

## Why Overpass is scripts-only

The Overpass API is a heavy, rate-limited public service. It must never be called from the
browser. In Power Atlas:

- The Overpass client (`lib/ingestion/osm/overpassClient.ts`) and the filesystem writers import
  `lib/serverOnly.ts`, which **throws if evaluated in a browser context**. If ingestion code is
  ever accidentally imported into a client component, the build breaks loudly instead of
  silently shipping node-only code (and its dependencies) to the client.
- The browser only ever `fetch`es the **local** GeoJSON files from `public/`.
- Shared logic in `lib/geo/*` and `lib/power/*` is pure and isomorphic (no node-only imports),
  so it runs in both the ingest script and the browser without modification.

This is verified at build time: `overpass-api.de` and `osmtogeojson` do not appear in the
client bundle (`.next/static`).

---

## Data-confidence model

Power Atlas is deliberate about how confident it is, and says so everywhere.

| Field | Value in v0.1 | Meaning |
|---|---|---|
| **Source confidence** | `community` | Data is community-sourced OSM, which may be incomplete. |
| **Path confidence** | `derived` | The candidate path is computed from proximity, not measured. |
| **Capacity status** | `unknown` | Capacity is never inferred or claimed. |
| **Voltage** | raw OSM string | Stored verbatim (e.g. `115000`, `115kV`, `115000;46000`). Never parsed, normalized, or used to infer capacity. |

**Resolution rule (the one judgment call, made explicit):** the candidate is the **nearest
substation, period**. Only if there is no substation in the dataset does it fall back to the
nearest transmission line. Power plants and generators are **context only** and are never inputs
to resolution.

**Representative coordinates:** ~97% of substations are polygons, so the marker/centroid for a
substation is the area-weighted centroid of its exterior ring. Lines use a midpoint coordinate;
points use themselves.

---

## Limitations

- OSM power infrastructure is community-sourced and may be incomplete.
- **Feature proximity does not imply grid connectivity.** The nearest visible substation may not
  be the correct interconnection point.
- Capacity is unknown unless verified by a utility or official study.
- Voltage tags may be missing (~4% of substations), unit-inconsistent, or multi-valued.
- Coverage is limited to the queried bounding box.
- The basemap loads free CARTO vector tiles at runtime (requires internet in the browser); the
  power data itself is always local.

---

## Project structure

```
app/                     Next.js App Router pages (/ and /data)
components/
  map/                   PowerAtlasMap + deck.gl layer builders, layer toggles
  power/                 ScenarioPanel, PowerHUD, DependencyWarnings
  data/                  IngestionCenter, SourceStatusCard, DataLimitationsPanel
  ui/                    Panel, Badge, MetricRow
lib/
  ingestion/osm/         Overpass query builder, client (server-only), normalizer
  geo/                   distance, centroid, nearest, bbox, geojson  (pure / isomorphic)
  power/                 loadClasses, dependencyResolver, powerWarnings  (pure / isomorphic)
  storage/               local GeoJSON writers (server-only), manifest builder
  serverOnly.ts          browser-bundle guard
scripts/
  ingest-osm-power.ts    ingestion CLI  (npm run ingest:osm-power)
types/                   infrastructure, geojson, scenario, dependency, ingestion
public/geojson/<region>/ generated GeoJSON + source manifest
```

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · MapLibre GL · react-map-gl ·
deck.gl 9 · osmtogeojson · axios · tsx.
