import "../../serverOnly"; // never bundle the network client into the browser
import axios from "axios";
import type { OverpassResponse } from "./osmTypes";

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ?? "https://overpass-api.de/api/interpreter";

export type OverpassErrorKind =
  | "timeout"
  | "rate_limit"
  | "unreachable"
  | "server"
  | "unknown";

export class OverpassError extends Error {
  kind: OverpassErrorKind;
  constructor(kind: OverpassErrorKind, message: string) {
    super(message);
    this.name = "OverpassError";
    this.kind = kind;
  }
}

// POST a raw Overpass QL query and return parsed JSON.
// Script/server use only. Distinct error kinds so callers can tell a blocked
// sandbox (unreachable) apart from a busy server (timeout / rate_limit).
export async function fetchOverpass(query: string): Promise<OverpassResponse> {
  try {
    const res = await axios.post<OverpassResponse>(OVERPASS_URL, query, {
      headers: {
        "Content-Type": "text/plain",
        // Overpass rejects the default axios UA with HTTP 406; an explicit,
        // identifying User-Agent is also expected by their usage policy.
        "User-Agent": "power-atlas-ingest/0.1 (OSM power infrastructure visualizer)",
      },
      timeout: 180_000, // generous: the server-side [timeout:60] is the real cap
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: "json",
    });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;

      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new OverpassError(
          "timeout",
          `Overpass request timed out contacting ${OVERPASS_URL}. The server may be busy — retry shortly.`,
        );
      }
      if (status === 429) {
        throw new OverpassError(
          "rate_limit",
          "Overpass returned 429 (rate limited / too many queries). Wait a minute and retry.",
        );
      }
      if (status === 504) {
        throw new OverpassError(
          "timeout",
          "Overpass returned 504 (gateway timeout). The query was too heavy or the server is overloaded.",
        );
      }
      if (status && status >= 500) {
        throw new OverpassError("server", `Overpass server error (HTTP ${status}).`);
      }
      // No response at all → DNS / connection blocked (e.g. sandbox allowlist).
      if (!err.response) {
        throw new OverpassError(
          "unreachable",
          `Could not reach ${OVERPASS_URL} (network error: ${err.code ?? "unknown"}). ` +
            "If running in a sandbox, outbound access to overpass-api.de may be blocked.",
        );
      }
      throw new OverpassError("unknown", `Overpass request failed (HTTP ${status}).`);
    }
    throw new OverpassError(
      "unknown",
      `Overpass request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
