import "../../serverOnly"; // never bundle the FEMA client into the browser
import axios from "axios";
import type { BboxSWNE } from "../../../types/ingestion";

// FEMA National Flood Hazard Layer — "Flood Hazard Zones" (S_Fld_Haz_Ar), the
// public NFHL ArcGIS MapServer. This IS the live importer seam: re-running it is
// the v0.5 live-source path; v0.4 runs it once to cache a real sample.
const NFHL_QUERY_URL =
  process.env.FEMA_NFHL_URL ??
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";

export type FemaErrorKind = "timeout" | "unreachable" | "server" | "unknown";

export class FemaError extends Error {
  kind: FemaErrorKind;
  constructor(kind: FemaErrorKind, message: string) {
    super(message);
    this.name = "FemaError";
    this.kind = kind;
  }
}

export interface RawFloodFeature {
  type: "Feature";
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown> | null;
}
export interface RawFloodCollection {
  type: "FeatureCollection";
  features: RawFloodFeature[];
}

// Query NFHL flood-hazard polygons intersecting a bbox as GeoJSON, paginating
// through the server's maxRecordCount. Distinct error kinds so a blocked sandbox
// (unreachable) is told apart from a busy/erroring service.
async function fetchPageWithRetry(params: URLSearchParams): Promise<RawFloodCollection> {
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await axios.get<RawFloodCollection>(`${NFHL_QUERY_URL}?${params.toString()}`, {
        timeout: 120_000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: { "User-Agent": "power-atlas-ingest/0.4 (flood-risk visualizer)" },
      });
      return res.data;
    } catch (err) {
      if (!axios.isAxiosError(err)) {
        throw new FemaError(
          "unknown",
          `FEMA NFHL request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const timeout = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";
      const server = (err.response?.status ?? 0) >= 500;
      const retryable = timeout || server;
      if (retryable && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      if (timeout) throw new FemaError("timeout", "FEMA NFHL request timed out after retries.");
      if (!err.response) {
        throw new FemaError(
          "unreachable",
          `Could not reach FEMA NFHL (${err.code ?? "network error"}). Outbound access to hazards.fema.gov may be blocked.`,
        );
      }
      if (server) {
        throw new FemaError("server", `FEMA NFHL server error (HTTP ${err.response.status}) after retries.`);
      }
      throw new FemaError("unknown", `FEMA NFHL request failed (HTTP ${err.response.status}).`);
    }
  }
}

export async function fetchNfhlFloodZones(
  bbox: BboxSWNE,
  opts?: { pageSize?: number; maxPages?: number; where?: string },
): Promise<RawFloodCollection> {
  const [south, west, north, east] = bbox;
  const where = opts?.where ?? "1=1";
  // NFHL 500s on heavy geometry payloads (it errors well below the 2000
  // maxRecordCount and is flaky under rapid paging). Small pages + a brief
  // inter-page delay are reliable. Paginate via resultOffset.
  const pageSize = opts?.pageSize ?? 200;
  const maxPages = opts?.maxPages ?? 60;
  const features: RawFloodFeature[] = [];

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      where,
      geometry: `${west},${south},${east},${north}`,
      geometryType: "esriGeometryEnvelope",
      inSR: "4326",
      outSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "FLD_ZONE,ZONE_SUBTY,DFIRM_ID,FLD_AR_ID",
      returnGeometry: "true",
      orderByFields: "FLD_AR_ID",
      resultOffset: String(page * pageSize),
      resultRecordCount: String(pageSize),
      f: "geojson",
    });

    // NFHL is flaky under load and returns transient 500s/timeouts — retry a few
    // times with backoff before giving up (a real failure still surfaces clearly).
    const data = await fetchPageWithRetry(params);

    const batch = data.features ?? [];
    features.push(...batch);
    if (batch.length < pageSize) break; // last page
    await new Promise((r) => setTimeout(r, 400)); // be gentle on a flaky service
  }

  return { type: "FeatureCollection", features };
}
