import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // Scope to the pure logic we unit-test. I/O glue (ingestion/storage/
      // serverOnly) is exercised by the real ingest run + the browser, not unit
      // tests, so including it would report misleading 0% noise.
      include: ["lib/geo/**", "lib/power/**", "lib/water/**", "lib/cooling/**", "lib/flood/**"],
      // Report only — NO thresholds. The consciously-uncovered centroid edge
      // branches (zero-area, 2-vertex, unknown geometry) must not fail CI.
    },
  },
});
