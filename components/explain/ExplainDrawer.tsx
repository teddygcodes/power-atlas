"use client";

import { useEffect } from "react";
import type { ExplainModel } from "../../lib/explain/explain";
import { Badge, type BadgeTone } from "../ui/Badge";
import { MetricRow } from "../ui/MetricRow";

// Read-only detail view of a resolver output. It renders ONLY the fields the
// `explain*` helpers surfaced — it computes nothing. Reason codes are shown with
// their human label AND the raw code (for transparency); raw tags are verbatim.
export function ExplainDrawer({
  model,
  onClose,
}: {
  model: ExplainModel;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rawTagEntries = model.rawTags ? Object.entries(model.rawTags) : [];

  return (
    <div className="fixed inset-0 z-20 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <aside className="relative flex h-full w-96 max-w-[90vw] flex-col overflow-y-auto border-l border-atlas-border bg-atlas-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-atlas-border px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-atlas-muted">
              Explain
            </p>
            <h2 className="text-sm font-semibold text-atlas-text">{model.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-atlas-dim hover:text-atlas-text"
          >
            ✕
          </button>
        </header>

        <div className="space-y-4 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {model.posture.map((b) => (
              <Badge key={b.label} tone={b.tone as BadgeTone}>
                {b.label}
              </Badge>
            ))}
          </div>

          <div>
            {model.rows.map((r) => (
              <MetricRow key={r.label} label={r.label} value={r.value} mono={r.mono} />
            ))}
          </div>

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Why this candidate
            </p>
            <ul className="space-y-1">
              {model.reasonCodes.map((rc) => (
                <li key={rc.code} className="text-[11px] leading-snug text-atlas-text">
                  {rc.label}
                  <span className="ml-1 font-mono text-[10px] text-atlas-dim">
                    {rc.code}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {rawTagEntries.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
                Raw source tags (verbatim)
              </p>
              <dl className="space-y-0.5">
                {rawTagEntries.map(([k, v]) => (
                  <div key={k} className="flex gap-2 font-mono text-[10px]">
                    <dt className="shrink-0 text-atlas-dim">{k}</dt>
                    <dd className="break-all text-atlas-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Caveats
            </p>
            <ul className="space-y-1.5">
              {model.caveats.map((c) => (
                <li
                  key={c}
                  className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted"
                >
                  <span aria-hidden className="mt-[1px] shrink-0 text-atlas-dim">
                    ▸
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
