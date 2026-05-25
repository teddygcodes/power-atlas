import type { ReactNode } from "react";
import { Panel } from "../ui/Panel";

function BulletList({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it} className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted">
          <span aria-hidden className={`mt-[1px] shrink-0 ${marker}`}>
            ▸
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function DataLimitationsPanel({
  warnings,
  limitations,
  waterWarnings,
  waterLimitations,
}: {
  warnings: string[];
  limitations: string[];
  waterWarnings?: string[];
  waterLimitations?: string[];
}): ReactNode {
  return (
    <div className="space-y-3">
      <Panel title="Power — Warnings">
        <BulletList items={warnings} marker="text-signal-candidate" />
      </Panel>
      <Panel title="Power — Limitations">
        <BulletList items={limitations} marker="text-atlas-dim" />
      </Panel>
      {waterWarnings && waterWarnings.length > 0 && (
        <Panel title="Water — Warnings">
          <BulletList items={waterWarnings} marker="text-signal-water" />
        </Panel>
      )}
      {waterLimitations && waterLimitations.length > 0 && (
        <Panel title="Water — Limitations">
          <BulletList items={waterLimitations} marker="text-atlas-dim" />
        </Panel>
      )}
    </div>
  );
}
