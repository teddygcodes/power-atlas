"use client";

import type { CandidateWaterDependency, WaterClass } from "../../types/water";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { MetricRow } from "../ui/MetricRow";

const WATER_CLASS_LABEL: Record<WaterClass, string> = {
  major_river: "Major River",
  reservoir: "Reservoir / Lake",
  minor_stream: "Minor Stream",
  unknown: "Unknown",
};

function typeLabel(t: string): string {
  return t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function WaterHUD({
  dependency,
}: {
  dependency: CandidateWaterDependency | null;
}) {
  return (
    <Panel
      title="Candidate Water Dependency"
      subtitle="Derived from public OSM data — proximity is not water rights"
    >
      {!dependency ? (
        <p className="text-xs text-atlas-muted">
          Enable the Water layer to resolve a candidate water source.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <MetricRow
              label="Candidate Water Source"
              value={dependency.name ?? dependency.featureId}
              title={dependency.featureId}
            />
            <MetricRow label="Water Type" value={typeLabel(dependency.waterType)} />
            <MetricRow
              label="Water Class"
              value={WATER_CLASS_LABEL[dependency.waterClass]}
            />
            <MetricRow label="Distance" value={`${dependency.distanceKm.toFixed(2)} km`} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone="community">Source: {dependency.sourceConfidence}</Badge>
            <Badge tone="derived">Path: {dependency.pathConfidence}</Badge>
            <Badge tone="unknown">Capacity: {dependency.capacityStatus}</Badge>
          </div>

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Reason Codes
            </p>
            <div className="flex flex-wrap gap-1">
              {dependency.reasonCodes.map((code) => (
                <span
                  key={code}
                  className="rounded bg-atlas-grid px-1.5 py-0.5 font-mono text-[10px] text-atlas-muted"
                >
                  {code.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Caveats
            </p>
            <ul className="space-y-1.5">
              {dependency.warnings.map((w) => (
                <li
                  key={w}
                  className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted"
                >
                  <span aria-hidden className="mt-[1px] shrink-0 text-signal-water">
                    ▸
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}
