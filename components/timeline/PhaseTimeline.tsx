"use client";

import type { BuildPhase } from "../../types/timeline";
import { BUILD_PHASES, PHASE_ORDINAL } from "../../lib/timeline/phases";

// Discrete, ordinal steps — deliberately NOT a continuous time slider. The control
// shows build SEQUENCE, never a schedule; there are no durations/dates anywhere.
const PHASE_LABEL: Record<BuildPhase, string> = {
  site_prep: "Site Prep",
  power_infrastructure: "Power",
  water_cooling: "Water + Cooling",
  operational: "Operational",
};

export function PhaseTimeline({
  phase,
  onChange,
}: {
  phase: BuildPhase;
  onChange: (phase: BuildPhase) => void;
}) {
  const currentOrdinal = PHASE_ORDINAL[phase];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-xl rounded-lg border border-atlas-border bg-atlas-panel/95 px-3 py-2.5 shadow-lg backdrop-blur">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-wider text-atlas-muted">
            Build Phase
          </p>
          <p className="font-mono text-[11px] text-atlas-text">
            {PHASE_LABEL[phase]}
            <span className="text-atlas-dim">
              {" "}
              · stage {currentOrdinal + 1} of {BUILD_PHASES.length}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {BUILD_PHASES.map((p) => {
            const reached = PHASE_ORDINAL[p] <= currentOrdinal;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                aria-pressed={p === phase}
                className={`rounded border px-2 py-1.5 text-[11px] transition-colors ${
                  p === phase
                    ? "border-signal-campus/60 bg-signal-campus/15 text-signal-campus"
                    : reached
                      ? "border-atlas-border bg-atlas-panelRaised text-atlas-text"
                      : "border-atlas-border bg-atlas-panelRaised text-atlas-muted hover:text-atlas-text"
                }`}
              >
                {PHASE_LABEL[p]}
              </button>
            );
          })}
        </div>

        <p className="mt-1.5 text-[10px] leading-snug text-atlas-dim">
          Phases show typical build SEQUENCE, not a schedule. Actual durations depend
          on permitting, interconnection queues, and construction factors not modeled
          here.
        </p>
      </div>
    </div>
  );
}
