import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "community"
  | "derived"
  | "unknown"
  | "info"
  | "caution";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-atlas-border bg-atlas-panelRaised text-atlas-muted",
  community: "border-signal-substation/40 bg-signal-substation/10 text-signal-substation",
  derived: "border-signal-transmission/40 bg-signal-transmission/10 text-signal-transmission",
  unknown: "border-atlas-dim/40 bg-atlas-dim/10 text-atlas-muted",
  info: "border-signal-plant/40 bg-signal-plant/10 text-signal-plant",
  caution: "border-signal-candidate/40 bg-signal-candidate/10 text-signal-candidate",
};

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
