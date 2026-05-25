"use client";

import { Panel } from "../ui/Panel";

export function DependencyWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <Panel title="Caveats">
      <ul className="space-y-1.5">
        {warnings.map((w) => (
          <li key={w} className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted">
            <span aria-hidden className="mt-[1px] shrink-0 text-signal-transmission">
              ▸
            </span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
