"use client";

import type { LayerVisibility } from "./PowerInfrastructureLayer";
import { Panel } from "../ui/Panel";

const ITEMS: { key: keyof LayerVisibility; label: string; swatch: string }[] = [
  { key: "substations", label: "Substations", swatch: "bg-signal-substation" },
  { key: "transmission", label: "Transmission Lines", swatch: "bg-signal-transmission" },
  { key: "plants", label: "Power Plants (context)", swatch: "bg-signal-plant" },
  { key: "candidatePath", label: "Candidate Power Path", swatch: "bg-signal-candidate" },
];

export function LayerTogglePanel({
  visibility,
  onToggle,
}: {
  visibility: LayerVisibility;
  onToggle: (key: keyof LayerVisibility) => void;
}) {
  return (
    <Panel title="Layers">
      <ul className="space-y-1">
        {ITEMS.map((item) => (
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
    </Panel>
  );
}
