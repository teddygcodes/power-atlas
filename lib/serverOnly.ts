// Browser-bundle safety guard.
//
// Import this at the top of any module that must never reach the client bundle:
// the Overpass network client, the filesystem GeoJSON writers, anything that
// touches `fs`, external APIs, or large node-only deps (e.g. osmtogeojson).
//
// In Node / tsx scripts `window` is undefined, so this is a no-op. If such a
// module is ever accidentally imported into a Client Component, this throws at
// module-evaluation time and breaks the build loudly — instead of silently
// shipping ingestion code (and its transitive deps) to the browser.
//
// We keep `lib/geo/*` and `lib/power/*` free of this guard on purpose: those are
// pure, isomorphic modules meant to be shared by both the ingest script and the
// browser UI in Phase 3.

if (typeof window !== "undefined") {
  throw new Error(
    "server-only module imported into the browser bundle. " +
      "Ingestion / network / filesystem code must stay out of client components. " +
      "Use local GeoJSON fetched from /public instead.",
  );
}

export {};
