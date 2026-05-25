"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SourceManifest } from "../../types/ingestion";
import { SourceStatusCard } from "./SourceStatusCard";
import { DataLimitationsPanel } from "./DataLimitationsPanel";

const MANIFEST_URL = "/geojson/georgia-demo/source-manifest.json";

export function IngestionCenter() {
  const [manifest, setManifest] = useState<SourceManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(MANIFEST_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((m: SourceManifest) => active && setManifest(m))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ingestion Center</h1>
          <p className="text-sm text-atlas-muted">
            Provenance and limitations of the loaded power dataset
          </p>
        </div>
        <Link href="/" className="text-xs text-signal-substation hover:underline">
          ← Back to map
        </Link>
      </div>

      {error && (
        <p className="rounded border border-signal-candidate/40 bg-signal-candidate/10 px-3 py-2 text-xs text-signal-candidate">
          Could not load source manifest ({error}). Run{" "}
          <code className="font-mono">npm run ingest:osm-power</code> first.
        </p>
      )}

      {!manifest && !error && (
        <p className="text-sm text-atlas-muted">Loading manifest…</p>
      )}

      {manifest && (
        <div className="space-y-4">
          <SourceStatusCard manifest={manifest} />
          <DataLimitationsPanel
            warnings={manifest.warnings}
            limitations={manifest.limitations}
            waterWarnings={manifest.waterWarnings}
            waterLimitations={manifest.waterLimitations}
          />
        </div>
      )}
    </main>
  );
}
