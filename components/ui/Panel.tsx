import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "p-3",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`rounded-md border border-atlas-border bg-atlas-panel ${className}`}
    >
      {title && (
        <header className="border-b border-atlas-border px-3 py-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-atlas-muted">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-atlas-dim">{subtitle}</p>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
