# Power Atlas

[![CI](https://github.com/teddygcodes/power-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/teddygcodes/power-atlas/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/teddygcodes/power-atlas/blob/main/LICENSE)

**AI Infrastructure Site → Power & Water Visualizer** — a public-data planning simulator.

Power Atlas ingests real OpenStreetMap infrastructure for a region and visualizes **candidate
dependencies** from a hypothetical AI data-center campus to the nearest *plausible* power and water
sources — shows how a campus choice in one layer (cooling type) **cascades** into another (water
demand) — flags **site-risk constraints** like whether the campus sits in or near a mapped FEMA
flood zone — **stages the build in phases** with a construction-sequence scrubber — and renders a
**schematic 3D massing** of the campus that assembles in step with those phases. It is a
visualization and exploration tool, not an engineering study, with rigorously honest
data-confidence labeling throughout.

---

## Disclaimer

> Power Atlas uses public and community-sourced infrastructure data for visualization and
> planning exploration. It does not represent official utility capacity, interconnection
> feasibility, engineering approval, or site suitability. All infrastructure dependencies shown
> are candidate/estimated and require professional verification.

---

## What it does (v0.6)

- **Ingests real public data** for a configurable bounding box (default: the Atlanta / North Georgia
  corridor) and writes local GeoJSON. Two **OSM** infrastructure layers — **power** (substations,
  transmission lines, power plants) and **water** (named rivers, reservoirs/lakes, streams) — plus a
  **FEMA** site-risk layer: **flood** zones from the National Flood Hazard Layer (NFHL).
- **Renders** all layers on a dark MapLibre + deck.gl map with per-layer toggles. Layers load **on
  demand** — water and flood are fetched only when their layer is enabled — so first paint stays fast.
- **Resolves a candidate power dependency and a candidate water dependency** for a campus location +
  size (50 / 100 / 250 / 500 MW): the nearest *plausible* source, reporting distance, the source
  type / raw voltage, a load/demand class, reason codes, and caveats.
- **Cooling is a scenario input** (air / hybrid / evaporative) — the first cross-layer interaction.
  It refines a qualitative **water-demand class** (low / moderate / high) from campus size + cooling,
  which feeds the water resolver. On the same campus, switch air → evaporative and watch a nearby
  stream flip from plausible to insufficient — a step toward a digital twin, not two parallel maps.
- **Flood is a site-risk constraint, not a dependency.** Instead of reaching out to a nearest source,
  the campus is tested **against** mapped FEMA flood zones (point-in-polygon): *inside* a zone → high
  concern, *near* one → moderate + nearest-edge distance, *none* → "no mapped zone — but absence is
  not proof of no risk." It reports a qualitative FEMA zone class and severity. **No path is drawn**,
  and flood does not interact with power / water / cooling. The data is **statically cached, not
  current** — every result tells you to verify against the official FEMA Flood Map Service Center.
- **Load-aware plausibility:** a large / high-demand campus prefers a transmission-voltage substation
  over a closer low-voltage one, and a major river/reservoir over a closer minor stream — but a
  less-suitable source is never hidden; it is surfaced and flagged.
- **Construction timeline** — a phase scrubber (`site prep → power → water + cooling → operational`)
  reveals the campus's own build features in sequence: the site marker, then the candidate power
  path, then the candidate water path. It is a **presentational reveal** of already-resolved
  features — nothing is recomputed — and shows build **sequence, not a schedule**: no durations,
  dates, or month/week numbers anywhere. At the operational phase the view is identical to the
  un-timelined map.
- **3D campus massing** — a react-three-fiber inset renders the campus as schematic blocks/cylinders
  (data halls, substation yard, transformers, cooling plant, water tanks, BESS, backup generators,
  roads), assembling in step with the same build phases. It is **purely cosmetic representative
  massing** — no real dimensions, layout, or per-asset specs, just plain type labels under a "not an
  architectural or engineering site design" caveat. Reuses the timeline's phase state; recomputes
  nothing.
- **Click to reposition** the campus, switch size, or change cooling; resolvers, HUDs, and candidate
  paths update live.
- **Surfaces provenance** in an Ingestion Center (`/data`): source-manifest counts, bbox, last sync,
  and per-layer warnings + limitations.

## What it does NOT do

Stress scenarios, site-screening, or full digital-twin modes. It does **not** model grid
connectivity, capacity, interconnection feasibility, water rights, or water-consumption magnitudes —
and never claims to. The construction timeline shows phase **sequence only — never a schedule**: no
build durations, dates, or per-phase cost/capacity numbers. The 3D campus is **schematic massing
only** — representative blocks, not real dimensions, layout, or engineering, with no per-asset specs.
Flood zones are **statically cached** FEMA data, not a live or authoritative determination, and carry
no fabricated probabilities or base-flood elevations (qualitative zone class only). There is no live
Overpass or FEMA call from the browser.

---

## Install

Requires Node 18+ (developed on Node 24).

```bash
npm install
```

The default `georgia-demo` dataset (power + water + flood GeoJSON) is **committed to the repo on
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

Tests (108, all green in CI on every push) cover the pure core against **real-data fixtures** — the
power and water resolvers, voltage/water classing, the cooling → water-demand mapping and its
cascade, the flood risk resolver (inside / near / none on real FEMA polygons) and point-in-polygon,
the timeline phase-reveal gate (ordinal-only, guarded against any duration/date leaking into output),
the 3D campus asset-to-phase reveal (cumulative, guarded against any fabricated spec in labels),
polygon centroid, nearest-feature search, geometry simplification, load classes, and warnings.

## Ingestion

```bash
npm run ingest:region                          # power + water + flood, default region georgia-demo
npm run ingest:osm-power                        # power only   (Overpass)
npm run ingest:osm-water                        # water only   (Overpass)
npm run ingest:fema-flood                       # flood only   (FEMA NFHL)
npm run ingest:region -- --region=my-area --bbox=33.4,-84.8,34.3,-83.8
```

`--bbox` is ordered **south,west,north,east** (the Overpass area-filter order). Ingestion writes to
`public/geojson/<region>/`: `substations.geojson`, `transmission-lines.geojson`,
`power-plants.geojson` (plants + generators, context only), `water.geojson`, `flood-zones.geojson`,
and a merged `source-manifest.json`. Raw source dumps go to `data/raw/<region>/` (gitignored). Water
ingests **named features only** (rivers / reservoirs / streams), dropping the large unnamed
pond/ditch tail; flood ingests **Special Flood Hazard Area (SFHA) zones only** by default, keeping
the committed file to the high-risk shapes that actually drive the site-risk readout. Geometry is
simplified at ingest to shrink the committed files (analysis is unaffected — see below). To point
the UI at a different region, change `REGION` in `components/PowerAtlasApp.tsx`. (Cooling is a
scenario input, not ingested — there is nothing to scrape.)

> **Note:** Overpass rejects the default HTTP-client User-Agent with `406 Not Acceptable`; the
> client sends an explicit identifying User-Agent (also Overpass usage-policy etiquette). The FEMA
> NFHL ArcGIS service is paged in small batches with a short inter-page delay (it returns `500` on
> heavy single-page geometry payloads). If either ingest fails with an `unreachable` error, your
> environment is blocking outbound access — run the script somewhere with access and copy the
> GeoJSON into `public/geojson/<region>/`. Flood ingestion is **fail-honest**: if no real FEMA data
> can be obtained it writes an empty FeatureCollection and the manifest says so — it never fabricates
> zones.

---

## Why ingestion is scripts-only

Overpass and the FEMA NFHL service are heavy, rate-limited public services. They must never be
called from the browser. In Power Atlas:

- The Overpass client (`lib/ingestion/osm/overpassClient.ts`), the FEMA flood client
  (`lib/ingestion/fema/floodClient.ts`), and the filesystem writers
  (`lib/storage/localGeoJsonStore.ts`) import `lib/serverOnly.ts`, which **throws if evaluated in a
  browser context**. If ingestion code is ever accidentally imported into a client component, the
  build breaks loudly instead of silently shipping node-only code (and its deps) to the client.
- The browser only ever `fetch`es the **local** GeoJSON files from `public/`.
- Shared logic in `lib/geo/*`, `lib/power/*`, `lib/water/*`, `lib/cooling/*`, and `lib/flood/*` is
  pure and isomorphic (no node-only imports), so it runs in both the ingest script and the browser
  unchanged.

Verified at runtime: enabling the flood layer issues **zero** requests to `hazards.fema.gov` /
`arcgis` (or `overpass-api.de`) from the client — all data is fetched locally.

---

## Data-confidence model

Power Atlas is deliberate about how confident it is, and says so everywhere. Every dependency
carries:

| Field | Value | Meaning |
|---|---|---|
| **Source confidence** | `community` (OSM) / `official` (FEMA) | OSM is community-sourced and may be incomplete; FEMA is official but **statically cached**, not current. |
| **Path confidence** | `derived` | The candidate path is computed from proximity, not measured. (Flood draws no path.) |
| **Capacity status** | `unknown` | Capacity is never inferred or claimed. |

**Resolution — load-aware plausibility (the same shape for both layers).** Candidates are ranked by
a qualitative class **then distance** — `plausible > unknown (data gap) > insufficient-for-load` —
picking the nearest within the top tier. A less-suitable source is **never excluded**; it is
surfaced with a warning.

- **Power** classes the raw `voltage` tag (transmission / sub-transmission / distribution). The raw
  string is preserved **verbatim** (`115000`, `115kV`, `115000;46000`) and never parsed for display.
  Power plants and generators are context only, never resolver inputs.
- **Water** classes type (major river / reservoir-lake / minor stream). No flow or consumption
  numbers are ever produced.
- **Cooling → water demand:** cooling type (air / hybrid / evaporative) plus campus size map to a
  qualitative demand class (low / moderate / high) that sets the water plausibility threshold. This
  is **direction and class only — never a consumption magnitude.** Actual water use depends on
  climate, cooling design, and load factor, which are not modeled; treat MW + cooling → demand as a
  deliberate placeholder, not a real relationship. Cooling does **not** affect power.

**Flood is a separate risk shape, not a dependency.** The flood resolver does not rank candidates or
draw a path — it tests the campus coordinate **against** mapped zones with point-in-polygon (holes
respected) and reports a `relationship` (inside / near / none), a qualitative FEMA `zoneClass`, and a
coarse `severity` (SFHA letters `A/AE/AO/AH/AR/A99/V/VE` → high, `X` → minimal, else unknown). *Near*
distance is the **nearest-ring-vertex** haversine (honest for large zones, where a centroid would
understate edge proximity). The data is real FEMA NFHL labeled `source: "fema"`,
`sourceConfidence: "official"`, `cached: true` — and **every** flood result carries the caveat that
it is statically cached, not authoritative, and must be verified against the FEMA Flood Map Service
Center (msc.fema.gov). No probabilities or base-flood elevations are ever fabricated, and *none* is
always qualified with "absence of a mapped zone is not proof of no risk."

**The construction timeline is presentational, and ordinal.** It is a **display gate** over
already-resolved features — it makes **no** resolver calls and recomputes nothing. Phases are an
ordered build *sequence* (`site_prep → power_infrastructure → water_cooling → operational`), never a
schedule: the layer emits no durations, dates, or per-phase cost/capacity numbers, and a test guards
the phase model + output against any time value leaking in. Scrubbing only reveals/hides the campus's
own build features; at the operational phase the rendered map equals the un-timelined view exactly.

**The 3D campus is schematic massing, not a model.** The react-three-fiber inset renders primitive
shapes (boxes / cylinders) in **arbitrary scene units** — relative sizes are roughly indicative (a
data hall reads bigger than a transformer) but are **not to-scale engineering**. Assets carry plain
type labels only — no kV, MWh, gallons, or dimensions — under a visible "representative massing — not
an architectural or engineering site design" caveat. It reads the same `buildPhase` state and makes
no resolver calls; it is decorative sequencing of known asset *types*, nothing more.

**Representative coordinates & geometry.** Each feature's analysis coordinate (`repCoord`) is
computed from **full-resolution** geometry at ingest — polygons (most substations, reservoirs) use
the area-weighted exterior-ring centroid, lines (transmission, rivers, streams) use a midpoint, and
points use themselves. The committed *display* geometry is then simplified (Douglas-Peucker +
coordinate rounding) to keep the GeoJSON small; the resolver always reads the stored full-res
`repCoord`, so simplification can never move a candidate or a distance.

---

## Limitations

- OSM infrastructure data is community-sourced and may be incomplete.
- **Proximity does not imply connectivity (power) or water rights / withdrawal capacity (water).**
  The nearest visible source may not be the real interconnection or supply point.
- Capacity is unknown unless verified by a utility or official study; **no consumption magnitudes**
  (gallons/day, MGD, MW-served, %) are ever shown.
- **Cooling → water demand is qualitative only** — a placeholder direction, not modeled consumption.
- **Flood zones are statically cached FEMA NFHL data, not current or authoritative**, and cover SFHA
  (high-risk) zones only by default. Verify against the official FEMA Flood Map Service Center
  (msc.fema.gov) before any siting decision; absence of a mapped zone is not proof of no risk.
- Voltage tags may be missing, unit-inconsistent, or multi-valued; water ingests named features only.
- Geometry is simplified for rendering and is not survey-accurate (analysis uses the full-res repCoord).
- Coverage is limited to the queried bounding box.
- The basemap loads free CARTO vector tiles at runtime (requires internet in the browser); the
  infrastructure data itself is always local.

---

## Project structure

```
app/                      Next.js App Router pages (/ and /data)
components/
  map/                    PowerAtlasMap + power/water/flood deck.gl layers, candidate paths, toggles
  power/                  ScenarioPanel (MW + cooling), PowerHUD, DependencyWarnings
  water/                  WaterHUD
  flood/                  FloodHUD (site-risk readout — no path)
  timeline/               PhaseTimeline (construction-sequence scrubber overlay)
  campus/                 Campus3D (react-three-fiber schematic massing inset)
  data/                   IngestionCenter, SourceStatusCard, DataLimitationsPanel
  ui/                     Panel, Badge, MetricRow
lib/
  ingestion/osm/          Overpass query builder, client (server-only), power + water normalizers
  ingestion/fema/         FEMA NFHL flood client (server-only) + normalizer
  geo/                    distance, centroid (+ repCoord helper), nearest, bbox, geojson, simplify,
                          pointInPolygon (ray-cast + nearest-vertex distance)
  power/                  voltageClass, loadClasses, dependencyResolver, powerWarnings
  water/                  waterClass, waterResolver, waterWarnings
  cooling/                waterDemand  (cooling type + MW → qualitative water-demand class)
  flood/                  floodResolver (risk shape), floodWarnings
  timeline/               phases (ordinal build-phase reveal gate — pure, no recompute)
  campus/                 assets (schematic asset catalog + per-phase reveal — pure, no recompute)
  storage/                local GeoJSON writers (server-only), manifest builder
  serverOnly.ts           browser-bundle guard
scripts/                  ingest-osm-power.ts, ingest-osm-water.ts, ingest-fema-flood.ts
types/                    infrastructure, water, flood, timeline, campus, geojson, scenario, dependency, ingestion
tests/                    vitest specs + real-data fixtures
public/geojson/<region>/  generated GeoJSON + source manifest
```

Contributing with an AI agent? See [CLAUDE.md](CLAUDE.md) for how to work in this repo.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · MapLibre GL · react-map-gl ·
deck.gl 9 · three + react-three-fiber 9 (lazy-loaded 3D inset) · osmtogeojson · axios · tsx · Vitest.
