import type { CampusSizeMW } from "../../types/scenario";

// Qualitative voltage classing for candidate ranking — NOT a capacity claim.
//
// The raw OSM `voltage` string is never overwritten; this parses it INTERNALLY
// only, to a comparable number, purely to bucket a substation into a coarse,
// estimated voltage class. Thresholds follow rough public-infrastructure
// conventions and are deliberately coarse — they are not precise engineering
// cutoffs and must be treated as derived/estimated.

export type VoltageClass =
  | "distribution"
  | "sub_transmission"
  | "transmission"
  | "unknown";

// Coarse, estimated thresholds (volts).
const SUB_TRANSMISSION_MIN_V = 69_000; // ~69 kV
const TRANSMISSION_MIN_V = 161_000; // ~161 kV / EHV

// Ordinal for comparison; "unknown" is handled separately (not comparable).
const CLASS_ORDINAL: Record<Exclude<VoltageClass, "unknown">, number> = {
  distribution: 1,
  sub_transmission: 2,
  transmission: 3,
};

// Parse ONE raw token (e.g. "115000", "115kV", " 230000 ") to volts, or null.
function parseToken(token: string): number | null {
  const t = token.trim().toLowerCase().replace(/\s+/g, "");
  if (t === "") return null;
  const kv = t.endsWith("kv");
  const numeric = kv ? t.slice(0, -2) : t;
  if (!/^\d+(\.\d+)?$/.test(numeric)) return null;
  const value = Number(numeric);
  if (Number.isNaN(value)) return null;
  return kv ? value * 1000 : value;
}

// Parse the RAW voltage string to a comparable number of volts (internal only).
// Semicolon multi-voltage takes the MAX token. Missing/garbage → null.
export function parseVoltageToVolts(raw?: string): number | null {
  if (raw == null) return null;
  let max: number | null = null;
  for (const token of raw.split(";")) {
    const v = parseToken(token);
    if (v != null && (max == null || v > max)) max = v;
  }
  return max;
}

export function classifyVoltage(raw?: string): VoltageClass {
  const v = parseVoltageToVolts(raw);
  if (v == null) return "unknown";
  if (v >= TRANSMISSION_MIN_V) return "transmission";
  if (v >= SUB_TRANSMISSION_MIN_V) return "sub_transmission";
  return "distribution";
}

// Minimum voltage class that is plausible for a given load — qualitative.
export function minPlausibleClassForLoad(
  mw: CampusSizeMW,
): "sub_transmission" | "transmission" {
  return mw >= 250 ? "transmission" : "sub_transmission";
}

// True when a known class meets/exceeds the minimum plausible class for the
// load. "unknown" is NOT plausible (but also not "low" — it's a data gap; the
// resolver ranks it between plausible and low-for-load).
export function isPlausible(cls: VoltageClass, mw: CampusSizeMW): boolean {
  if (cls === "unknown") return false;
  return CLASS_ORDINAL[cls] >= CLASS_ORDINAL[minPlausibleClassForLoad(mw)];
}
