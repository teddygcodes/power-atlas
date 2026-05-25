# Power Atlas

AI infrastructure site → power/water/risk visualizer. Ingests real public infrastructure data for a
bbox and maps *candidate* dependencies from a hypothetical data-center campus to nearest plausible
sources, plus site-risk constraints, with deliberately honest data-confidence labeling. Next.js 15 +
React 19 + TS, MapLibre + deck.gl, Vitest.

## Scope (current state)
- **Built (v0.4):** power resolver, water resolver, cooling→water cascade, flood site-risk; lazy-loaded layers + repCoord geometry decoupling; 91 tests.
- **Roadmap — do not add unprompted:** construction timeline, stress scenarios, 3D campus assets, full digital-twin modes.
- **Two resolver shapes now exist.** Power & water are *nearest-source dependency* resolvers (path drawn). Flood is a *site-risk constraint* (campus inside/near a zone via point-in-polygon; NO path). Don't force a new risk layer into the dependency shape, or vice-versa — pick the shape that matches the question.
- **Cooling is a cross-layer input,** not a map layer: cooling type + MW → qualitative water-demand class feeding the water resolver. Flood does NOT interact with power/water/cooling.

## Commands
- `npm run dev` — dev server at localhost:3000
- `npm run build` · `npm run lint` · `npm run typecheck` (tsc --noEmit) · `npm test` (vitest) · `npm run coverage`
- `npm run ingest:osm-power` · `ingest:osm-water` (Overpass) · `ingest:fema-flood` (FEMA NFHL) · `ingest:region` (all three) → `public/geojson/<region>/*.geojson` + `source-manifest.json`. Flags: `--region=`, `--bbox=south,west,north,east`. Flood ingests SFHA zones only by default; fail-honest (empty FC, never fabricated) if no real data.

## Architecture & boundaries
- **Ingestion is scripts/server-only.** The Overpass client (`lib/ingestion/osm/overpassClient.ts`), the FEMA flood client (`lib/ingestion/fema/floodClient.ts`), and the filesystem writers (`lib/storage/localGeoJsonStore.ts`) import `lib/serverOnly.ts`, which throws in a browser. The browser only `fetch`es local GeoJSON from `public/geojson/<region>/` — never Overpass or FEMA.
- **`lib/geo/*`, `lib/power/*`, `lib/water/*`, `lib/cooling/*`, `lib/flood/*` are pure/isomorphic** (no node-only imports) — shared by the ingest script and the browser. Keep them that way.
- **Dependency resolvers share one pattern** (`dependencyResolver.ts`, `waterResolver.ts`): rank by load-aware plausibility **tier-then-distance** — `plausible(0) > unknown/data-gap(1) > low-for-load(2)`, nearest within tier. Never hard-exclude a candidate; surface it and warn. New *dependency* layers mirror this.
- **Flood resolver (`lib/flood/floodResolver.ts`) is a DIFFERENT shape — risk, not dependency.** It returns `CampusFloodRisk` (relationship inside/near/none + qualitative severity), not a `Candidate*Dependency`. No ranking, no path, no `pathConfidence`/`capacityStatus`. Don't retrofit it onto the nearest-source pattern. Inside = point-in-polygon (`lib/geo/pointInPolygon.ts`, holes respected); near distance = nearest-ring-vertex haversine (≤1km), not centroid.
- Generated GeoJSON in `public/geojson/` is **committed on purpose** (app runs on clone); `data/raw/` is gitignored.

## Conventions — honesty (non-negotiable)
- Every dependency is candidate/estimated: `capacityStatus: "unknown"`, `pathConfidence: "derived"`, `sourceConfidence: "community"`, with proximity-caveat warnings (power: ≠ connectivity; water: ≠ water rights).
- **Never emit numbers implying capacity** (MW served, gallons/day, MGD, %). Classing (voltage / water type / flood zone) is qualitative and internal-only.
- Raw OSM tags (esp. `voltage`) and raw FEMA attrs are preserved **verbatim** in `rawTags` — never parsed/normalized for display.
- **Water demand = cooling type + campus MW → qualitative class (low/moderate/high)** that sets the water plausibility threshold. Direction and class ONLY — never a consumption magnitude; actual use (climate/design/load factor) is unmodeled. Don't build numbers on top of it.
- **Flood honesty is the sharpest constraint.** Real FEMA NFHL labeled `source:"fema"`, `sourceConfidence:"official"`, `cached:true` — BUT every flood result must carry the "statically cached, not authoritative, verify at msc.fema.gov" caveat, and *none* adds "absence isn't proof of no risk." **NEVER fabricate flood polygons, probabilities, or base-flood elevations** — real FEMA data or honest-empty, nothing between. Qualitative zone class only.

## Testing
- Vitest; tests in `tests/**/*.test.ts` (tsc type-checks tests too; resolveJsonModule is on).
- **Use real-data fixtures, not toy data.** Extract real features from the ingested GeoJSON into `tests/fixtures/*.json`; test the full path (irregular polygon → centroid → nearest → resolver). Spread fixtures so the nearest is unambiguous.
- Coverage scoped to `lib/geo|power|water|cooling|flood`; CI reports it with **no threshold gate**.
- Flood tests assert **no fabricated magnitude** in output (regex-guard %/gpd/MGD/ft/annual-chance) and that the cached/MSC caveat is always present.

## Gotchas
- **Overpass returns HTTP 406 for the default HTTP-client User-Agent.** `overpassClient.ts` sends an explicit `User-Agent` — keep it.
- **FEMA NFHL ArcGIS returns HTTP 500 on heavy single-page geometry payloads.** `floodClient.ts` pages in small batches (200) with a ~400ms inter-page delay + retry/backoff; large page sizes (≥500 records of dense polygons) reliably 500. Don't bump the page size to "go faster."
- **npm lockfile drops cross-platform optional deps on macOS.** Incremental `npm install` on macOS prunes `@emnapi/*` / `sharp-wasm32` from `package-lock.json`, breaking `npm ci` on Linux CI. After changing deps: `rm -rf node_modules package-lock.json && npm install`, confirm `@emnapi/runtime`+`core` are in the lock, then `npm ci` to verify. (`rm -rf node_modules` may need a second run.)
- `next build` failing with `MODULE_NOT_FOUND` for a `react-dom` server file = inconsistent `node_modules` from install churn → clean `npm ci`.
- deck.gl + react-map-gl(maplibre) + maplibre-gl resolve cleanly (no pinning). `PathLayer.getPath` must return tuple `Position[]`, not widened `number[][]`.
- CI runs Node 22; the "Node 20 actions deprecated" annotation is informational, not a failure.

## Workflow
- Build in phases; show real output at checkpoints (ingestion counts, resolver-on-fixture) before proceeding.
- Verify UI in a real browser and confirm **zero Overpass/FEMA calls from the client** before claiming done.
- Commit phase-by-phase; push and watch CI (`gh run watch <id> --exit-status`) to green.
- Before `git add -A`, check `git status` for untracked junk (throwaway scripts, stray PNGs, scratch files) and remove it. Don't blind-stage.
