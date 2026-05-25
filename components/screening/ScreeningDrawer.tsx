"use client";

import { useEffect } from "react";
import type { ScreeningCell, ScreeningRating, DimensionDetail } from "../../types/screening";
import { reasonCodeLabel } from "../../lib/explain/explain";

// Read-only per-dimension breakdown for a screened cell. Surfaces the three
// independent ratings + each resolver's reason codes + the standing caveat. There
// is NO composite score and NO recommendation — just the qualitative "why".
const RATING_LABEL: Record<ScreeningRating, string> = {
  favorable: "Favorable",
  mixed: "Mixed",
  unfavorable: "Unfavorable",
};
// Restrained, non-traffic-light tones (no "good site" green).
const RATING_CLASS: Record<ScreeningRating, string> = {
  favorable: "text-signal-screening",
  mixed: "text-signal-transmission",
  unfavorable: "text-atlas-dim",
};

function DimensionBlock({ title, detail }: { title: string; detail: DimensionDetail }) {
  return (
    <div className="border-t border-atlas-border pt-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-wider text-atlas-muted">{title}</p>
        <p className={`text-xs font-semibold ${RATING_CLASS[detail.rating]}`}>
          {RATING_LABEL[detail.rating]}
          {detail.distanceKm != null && (
            <span className="ml-1 font-mono text-[10px] text-atlas-dim">
              {detail.distanceKm.toFixed(2)} km
            </span>
          )}
        </p>
      </div>
      <ul className="mt-1 space-y-0.5">
        {detail.reasons.map((code) => (
          <li key={code} className="text-[11px] leading-snug text-atlas-text">
            {reasonCodeLabel(code)}
            <span className="ml-1 font-mono text-[10px] text-atlas-dim">{code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScreeningDrawer({
  cell,
  caveat,
  onClose,
}: {
  cell: ScreeningCell;
  caveat: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={onClose} />
      <aside className="relative flex h-full w-96 max-w-[90vw] flex-col overflow-y-auto border-l border-atlas-border bg-atlas-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-atlas-border px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-atlas-muted">
              Screening — cell detail
            </p>
            <h2 className="text-sm font-semibold text-atlas-text">
              {cell.worthInvestigating ? "Worth investigating" : "Not surfaced"}
            </h2>
            <p className="font-mono text-[10px] text-atlas-dim">
              {cell.center[1].toFixed(3)}, {cell.center[0].toFixed(3)}
            </p>
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

        <div className="space-y-3 px-4 py-3">
          <p className="text-[11px] leading-snug text-atlas-muted">
            {cell.worthInvestigating
              ? "Not unfavorable on any dimension — a starting point for diligence, not a recommendation."
              : "Unfavorable on at least one dimension (see below)."}
          </p>
          <DimensionBlock title="Power" detail={cell.power} />
          <DimensionBlock title="Water" detail={cell.water} />
          <DimensionBlock title="Flood (mapped risk)" detail={cell.flood} />

          <div className="border-t border-atlas-border pt-2">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Caveat
            </p>
            <p className="text-[11px] leading-relaxed text-atlas-muted">{caveat}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
