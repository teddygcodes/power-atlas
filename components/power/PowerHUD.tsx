"use client";

import type { CampusSizeMW } from "../../types/scenario";
import type { CandidatePowerDependency, LoadClass } from "../../types/dependency";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { MetricRow } from "../ui/MetricRow";

const LOAD_CLASS_LABEL: Record<LoadClass, string> = {
  moderate: "Moderate",
  large: "Large",
  very_large: "Very Large",
  extreme: "Extreme",
};

function featureTypeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function reasonLabel(code: string): string {
  return code.replace(/_/g, " ");
}

export function PowerHUD({
  dependency,
  campusSizeMW,
  onExplain,
}: {
  dependency: CandidatePowerDependency | null;
  campusSizeMW: CampusSizeMW;
  onExplain: () => void;
}) {
  return (
    <Panel
      title="Candidate Power Dependency"
      subtitle="Derived from public OSM data — not a utility study"
    >
      {!dependency ? (
        <p className="text-xs text-atlas-muted">
          No candidate power dependency could be resolved for this location.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <MetricRow label="Campus Size" value={`${campusSizeMW} MW`} />
            <MetricRow
              label="Load Class"
              value={LOAD_CLASS_LABEL[dependency.loadClass]}
            />
            <MetricRow
              label="Candidate Dependency"
              value={dependency.name ?? dependency.featureId}
              title={dependency.featureId}
            />
            <MetricRow
              label="Candidate Feature Type"
              value={featureTypeLabel(dependency.featureType)}
            />
            <MetricRow
              label="Distance"
              value={`${dependency.distanceKm.toFixed(2)} km`}
            />
            <MetricRow
              label="Voltage Tag (raw)"
              value={dependency.voltage ?? "— missing —"}
              title="Raw OSM voltage string, verbatim"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone="community" title={`Source confidence: ${dependency.sourceConfidence}`}>
              Source: {dependency.sourceConfidence}
            </Badge>
            <Badge tone="derived" title="Path confidence">
              Path: {dependency.pathConfidence}
            </Badge>
            <Badge tone="unknown" title="Capacity is not claimed in v0.1">
              Capacity: {dependency.capacityStatus}
            </Badge>
          </div>

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Likely Infrastructure Requirement
            </p>
            <p className="text-xs leading-relaxed text-atlas-text">
              {dependency.likelyRequirement}
            </p>
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
                  {reasonLabel(code)}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onExplain}
            className="w-full rounded border border-atlas-border bg-atlas-panelRaised px-2 py-1.5 text-[11px] text-atlas-muted hover:text-atlas-text"
          >
            Explain this candidate ▸
          </button>
        </div>
      )}
    </Panel>
  );
}
