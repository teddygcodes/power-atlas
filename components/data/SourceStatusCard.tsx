import type { SourceManifest } from "../../types/ingestion";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { MetricRow } from "../ui/MetricRow";

export function SourceStatusCard({ manifest }: { manifest: SourceManifest }) {
  const [s, w, n, e] = manifest.bbox;
  return (
    <Panel title="Source Status" subtitle={manifest.region}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="community">Source: {manifest.source}</Badge>
          <Badge tone="community">Confidence: community</Badge>
        </div>
        <div>
          <MetricRow label="Last synced" value={new Date(manifest.lastSyncedAt).toLocaleString()} />
          <MetricRow label="BBox (S,W,N,E)" value={`${s}, ${w}, ${n}, ${e}`} />
          <MetricRow label="Raw GeoJSON features" value={manifest.rawFeatureCount.toLocaleString()} />
          <MetricRow label="Substations" value={manifest.substationCount.toLocaleString()} />
          <MetricRow label="Transmission lines" value={manifest.transmissionLineCount.toLocaleString()} />
          <MetricRow label="Power plants" value={manifest.powerPlantCount.toLocaleString()} />
          <MetricRow label="Generators" value={manifest.generatorCount.toLocaleString()} />
        </div>
      </div>
    </Panel>
  );
}
