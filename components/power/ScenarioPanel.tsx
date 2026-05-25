"use client";

import type { CampusSizeMW, CoolingType } from "../../types/scenario";
import { Panel } from "../ui/Panel";

const SIZES: CampusSizeMW[] = [50, 100, 250, 500];
const COOLING: { value: CoolingType; label: string }[] = [
  { value: "air", label: "Air" },
  { value: "hybrid", label: "Hybrid" },
  { value: "evaporative", label: "Evap" },
];

export function ScenarioPanel({
  campusSizeMW,
  onSizeChange,
  coolingType,
  onCoolingChange,
  campus,
  isDefaultCampus,
  onReset,
}: {
  campusSizeMW: CampusSizeMW;
  onSizeChange: (mw: CampusSizeMW) => void;
  coolingType: CoolingType;
  onCoolingChange: (c: CoolingType) => void;
  campus: [number, number];
  isDefaultCampus: boolean;
  onReset: () => void;
}) {
  return (
    <Panel title="Scenario" subtitle="Hypothetical data-center campus">
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[11px] text-atlas-muted">Campus size (MW)</p>
          <div className="grid grid-cols-4 gap-1">
            {SIZES.map((mw) => (
              <button
                key={mw}
                type="button"
                onClick={() => onSizeChange(mw)}
                className={`rounded border px-2 py-1.5 font-mono text-xs transition-colors ${
                  campusSizeMW === mw
                    ? "border-signal-candidate/60 bg-signal-candidate/15 text-signal-candidate"
                    : "border-atlas-border bg-atlas-panelRaised text-atlas-muted hover:text-atlas-text"
                }`}
              >
                {mw}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] text-atlas-muted">Cooling type</p>
          <div className="grid grid-cols-3 gap-1">
            {COOLING.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onCoolingChange(c.value)}
                className={`rounded border px-2 py-1.5 text-xs transition-colors ${
                  coolingType === c.value
                    ? "border-signal-water/60 bg-signal-water/15 text-signal-water"
                    : "border-atlas-border bg-atlas-panelRaised text-atlas-muted hover:text-atlas-text"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-0.5 text-[10px] text-atlas-dim">
            refines water demand only (not power)
          </p>
        </div>

        <div>
          <p className="mb-1 text-[11px] text-atlas-muted">Campus location</p>
          <p className="font-mono text-xs text-atlas-text">
            {campus[1].toFixed(4)}, {campus[0].toFixed(4)}
          </p>
          <p className="mt-0.5 text-[10px] text-atlas-dim">
            lat, lng · click the map to reposition
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={isDefaultCampus}
          className="w-full rounded border border-atlas-border bg-atlas-panelRaised px-2 py-1.5 text-[11px] text-atlas-muted enabled:hover:text-atlas-text disabled:opacity-40"
        >
          Reset to default location
        </button>
      </div>
    </Panel>
  );
}
