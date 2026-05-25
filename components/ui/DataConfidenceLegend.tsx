"use client";

import { Panel } from "./Panel";

// Compact, non-intrusive legend for the confidence vocabulary used across the app.
// Collapsible so it stays out of the way until wanted.
const ENTRIES: { term: string; dot: string; meaning: string }[] = [
  { term: "Community", dot: "bg-signal-substation", meaning: "OpenStreetMap / community-sourced" },
  { term: "Official", dot: "bg-signal-water", meaning: "Agency source-of-record (may be cached)" },
  { term: "Derived", dot: "bg-signal-transmission", meaning: "Computed by Power Atlas from public data" },
  { term: "Unknown", dot: "bg-atlas-dim", meaning: "Not available from public data" },
];

export function DataConfidenceLegend() {
  return (
    <Panel title="Data Confidence" bodyClassName="p-0">
      <details className="group">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] text-atlas-muted hover:text-atlas-text">
          What the confidence labels mean
          <span className="float-right text-atlas-dim group-open:hidden">＋</span>
          <span className="float-right hidden text-atlas-dim group-open:inline">－</span>
        </summary>
        <ul className="space-y-1.5 border-t border-atlas-border px-3 py-2">
          {ENTRIES.map((e) => (
            <li key={e.term} className="flex gap-2 text-[11px] leading-snug">
              <span aria-hidden className={`mt-[3px] h-2 w-2 shrink-0 rounded-sm ${e.dot}`} />
              <span>
                <span className="font-semibold text-atlas-text">{e.term}</span>
                <span className="text-atlas-muted"> — {e.meaning}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </Panel>
  );
}
