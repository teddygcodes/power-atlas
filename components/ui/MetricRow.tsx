import type { ReactNode } from "react";

export function MetricRow({
  label,
  value,
  title,
  mono = true,
}: {
  label: string;
  value: ReactNode;
  title?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-atlas-border/40 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-atlas-muted">{label}</span>
      <span
        title={title}
        className={`text-right text-xs text-atlas-text ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
