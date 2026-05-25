"use client";

// The mandatory standing caveat, shown prominently whenever screening is active.
// Screening is a starting point for diligence — never a site recommendation.
export function ScreeningCaveatBanner({ caveat }: { caveat: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
      <div className="pointer-events-auto max-w-2xl rounded-lg border border-signal-screening/40 bg-atlas-panel/95 px-3 py-2 shadow-lg backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-signal-screening">
          Grid Screening — narrows where to investigate
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-atlas-muted">{caveat}</p>
      </div>
    </div>
  );
}
