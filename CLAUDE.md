# Power Atlas

AI infrastructure site → power/water visualizer. Ingests real OpenStreetMap infrastructure for a
bbox and maps a *candidate* dependency from a hypothetical data-center campus to the nearest
plausible source, with deliberately honest data-confidence labeling. Next.js 15 + React 19 + TS,
MapLibre + deck.gl, Vitest.

## Scope (current state)
- **Built (v0.2):** power resolver, water resolver; lazy-loaded layers + repCoord geometry decoupling; 68 tests.
- **Roadmap — do not add unprompted:** cooling, flood risk, construction timeline, stress scenarios, 3D campus assets.
- **Cooling is next, and is the FIRST layer that interacts with an existing one** — it feeds water demand and retires the MW→water proxy, so it is not a clean isolated mirror like water was. Scope it carefully.

## Commands
- `npm run dev` — dev server at localhost:3000
- `npm run build` · `npm run lint` · `npm run typecheck` (tsc --noEmit) · `npm test` (vitest) · `npm run coverage`
- `npm run ingest:osm-power` · `ingest:osm-water` · `ingest:region` (both) — Overpass → `public/geojson/<region>/*.geojson` + `source-manifest.json`. Flags: `--region=`, `--bbox=south,west,north,east`.

## Architecture & boundaries
- **Overpass is scripts/server-only.** The Overpass client (`lib/ingestion/osm/overpassClient.ts`) and the filesystem writers (`lib/storage/localGeoJsonStore.ts`) import `lib/serverOnly.ts`, which throws if evaluated in a browser. The browser only `fetch`es local GeoJSON from `public/geojson/<region>/` — never Overpass.
- **`lib/geo/*`, `lib/power/*`, `lib/water/*` are pure/isomorphic** (no node-only imports) — shared by the ingest script and the browser. Keep them that way.
- **Resolvers share one pattern** (`dependencyResolver.ts`, `waterResolver.ts`): rank by load-aware plausibility **tier-then-distance** — `plausible(0) > unknown/data-gap(1) > low-for-load(2)`, nearest within tier. Never hard-exclude a candidate; surface it and warn. New layers mirror this, not reimplement.
- Generated GeoJSON in `public/geojson/` is **committed on purpose** (app runs on clone); `data/raw/` is gitignored.

## Conventions — honesty (non-negotiable)
- Every dependency is candidate/estimated: `capacityStatus: "unknown"`, `pathConfidence: "derived"`, `sourceConfidence: "community"`, with proximity-caveat warnings (power: ≠ connectivity; water: ≠ water rights).
- **Never emit numbers implying capacity** (MW served, gallons/day, MGD, %). Classing (voltage / water type) is qualitative and internal-only.
- Raw OSM tags (esp. `voltage`) are preserved **verbatim** — never parsed/normalized for display.
- **Water demand is keyed off campus MW as a ROUGH PROXY ONLY** — cooling is not yet modeled. This is a deliberate placeholder, not a real relationship; replace it when the cooling layer lands. Do not treat MW→water as settled, and do not build numbers on top of it.

## Testing
- Vitest; tests in `tests/**/*.test.ts` (tsc type-checks tests too; resolveJsonModule is on).
- **Use real-data fixtures, not toy data.** Extract real features from the ingested GeoJSON into `tests/fixtures/*.json`; test the full path (irregular polygon → centroid → nearest → resolver). Spread fixtures so the nearest is unambiguous.
- Coverage scoped to `lib/geo|power|water`; CI reports it with **no threshold gate**.

## Gotchas
- **Overpass returns HTTP 406 for the default HTTP-client User-Agent.** `overpassClient.ts` sends an explicit `User-Agent` — keep it.
- **npm lockfile drops cross-platform optional deps on macOS.** Incremental `npm install` on macOS prunes `@emnapi/*` / `sharp-wasm32` from `package-lock.json`, breaking `npm ci` on Linux CI. After changing deps: `rm -rf node_modules package-lock.json && npm install`, confirm `@emnapi/runtime`+`core` are in the lock, then `npm ci` to verify. (`rm -rf node_modules` may need a second run.)
- `next build` failing with `MODULE_NOT_FOUND` for a `react-dom` server file = inconsistent `node_modules` from install churn → clean `npm ci`.
- deck.gl + react-map-gl(maplibre) + maplibre-gl resolve cleanly (no pinning). `PathLayer.getPath` must return tuple `Position[]`, not widened `number[][]`.
- CI runs Node 22; the "Node 20 actions deprecated" annotation is informational, not a failure.

## Workflow
- Build in phases; show real output at checkpoints (ingestion counts, resolver-on-fixture) before proceeding.
- Verify UI in a real browser and confirm **zero Overpass calls from the client** before claiming done.
- Commit phase-by-phase; push and watch CI (`gh run watch <id> --exit-status`) to green.
- Before `git add -A`, check `git status` for untracked junk (throwaway scripts, stray PNGs, scratch files) and remove it. Don't blind-stage.
