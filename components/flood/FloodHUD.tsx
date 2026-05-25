"use client";

import type { CampusFloodRisk, FloodRelationship, FloodSeverity } from "../../types/flood";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { MetricRow } from "../ui/MetricRow";

const RELATIONSHIP_LABEL: Record<FloodRelationship, string> = {
  inside: "Inside a mapped zone",
  near: "Near a mapped zone",
  none: "No mapped zone nearby",
};
const SEVERITY_LABEL: Record<FloodSeverity, string> = {
  high: "High (SFHA, 1%-annual-chance)",
  moderate: "Moderate",
  minimal: "Minimal",
  unknown: "Unknown",
};

export function FloodHUD({ risk }: { risk: CampusFloodRisk | null }) {
  return (
    <Panel
      title="Flood Risk (FEMA NFHL)"
      subtitle="Site-risk constraint — statically cached, verify with FEMA MSC"
    >
      {!risk ? (
        <p className="text-xs text-atlas-muted">
          Enable the Flood Zones layer to assess campus flood risk.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <MetricRow
              label="Campus Relationship"
              value={RELATIONSHIP_LABEL[risk.relationship]}
            />
            <MetricRow label="Zone Severity" value={SEVERITY_LABEL[risk.severity]} />
            {risk.zoneClass && <MetricRow label="FEMA Zone" value={risk.zoneClass} />}
            {risk.distanceKm != null && (
              <MetricRow label="Distance to Zone" value={`${risk.distanceKm.toFixed(2)} km`} />
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone="caution">Risk: {risk.riskStatus}</Badge>
            <Badge tone="community">Source: FEMA (cached)</Badge>
          </div>

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-atlas-muted">
              Reason Codes
            </p>
            <div className="flex flex-wrap gap-1">
              {risk.reasonCodes.map((code) => (
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
              {risk.warnings.map((w) => (
                <li
                  key={w}
                  className="flex gap-2 text-[11px] leading-relaxed text-atlas-muted"
                >
                  <span aria-hidden className="mt-[1px] shrink-0 text-signal-flood">
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
