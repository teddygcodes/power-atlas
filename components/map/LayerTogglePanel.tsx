"use client";

import type { LayerVisibility } from "./PowerInfrastructureLayer";
import { Panel } from "../ui/Panel";

type ToggleItem = { key: keyof LayerVisibility; label: string; swatch: string };

// Grouped by resource / risk so the panel also reads as the map's color legend.
const GROUPS: { heading: string; items: ToggleItem[] }[] = [
  {
    heading: "Power",
    items: [
      { key: "substations", label: "Substations", swatch: "bg-signal-substation" },
      { key: "transmission", label: "Transmission Lines", swatch: "bg-signal-transmission" },
      { key: "plants", label: "Power Plants (context)", swatch: "bg-signal-plant" },
      { key: "candidatePath", label: "Candidate Power Path", swatch: "bg-signal-candidate" },
    ],
  },
  {
    heading: "Water",
    items: [
      { key: "water", label: "Water", swatch: "bg-signal-water" },
      { key: "waterPath", label: "Candidate Water Path", swatch: "bg-signal-waterCandidate" },
    ],
  },
  {
    heading: "Risk",
    items: [{ key: "flood", label: "Flood Zones (FEMA)", swatch: "bg-signal-flood" }],
  },
  {
    heading: "Screening",
    items: [{ key: "screening", label: "Grid Screening (beta)", swatch: "bg-signal-screening" }],
  },
];

export function LayerTogglePanel({
  visibility,
  onToggle,
}: {
  visibility: LayerVisibility;
  onToggle: (key: keyof LayerVisibility) => void;
}) {
  return (
    <Panel title="Layers" subtitle="Toggles double as the map color legend">
      <div className="space-y-3">
        {GROUPS.map((group) => (
          <div key={group.heading}>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-atlas-muted">
              {group.heading}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.key}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-atlas-panelRaised">
                    <input
                      type="checkbox"
                      checked={visibility[item.key]}
                      onChange={() => onToggle(item.key)}
                      className="h-3 w-3 accent-atlas-text"
                    />
                    <span className={`h-2 w-2 rounded-sm ${item.swatch}`} aria-hidden />
                    <span className="text-xs text-atlas-text">{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
