import { Panel } from "../ui/Panel";

export function DataLimitationsPanel({
  warnings,
  limitations,
}: {
  warnings: string[];
  limitations: string[];
}) {
  return (
    <div className="space-y-3">
      <Panel title="Warnings">
        <ul className="space-y-1.5">
          {warnings.map((wn) => (
            <li key={wn} className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted">
              <span aria-hidden className="mt-[1px] shrink-0 text-signal-candidate">
                ▸
              </span>
              <span>{wn}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Limitations">
        <ul className="space-y-1.5">
          {limitations.map((lm) => (
            <li key={lm} className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted">
              <span aria-hidden className="mt-[1px] shrink-0 text-atlas-dim">
                ▸
              </span>
              <span>{lm}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
