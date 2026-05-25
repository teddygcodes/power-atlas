import type { CandidatePowerDependency } from "../../types/dependency";
import type { CandidateWaterDependency } from "../../types/water";
import type { CampusFloodRisk } from "../../types/flood";
import type { DimensionDetail } from "../../types/screening";
import { isPlausibleWater } from "../water/waterClass";

// Map each EXISTING resolver output → favorable / mixed / unfavorable. These are
// QUALITATIVE classifications of resolver output, never a composite score. The
// distance constants below are COARSE, INTERNAL screening thresholds — they are
// never presented to the user as claims (the user sees the rating + the resolver's
// own reason codes + the resolved distance, which is output, not a threshold).
const POWER_NEAR_KM = 5;
const POWER_FAR_KM = 15;
const WATER_NEAR_KM = 8;
const WATER_FAR_KM = 25; // water bodies are sparser/larger → coarser range

// Power: favorable = a plausible-voltage-class substation is near; mixed = a
// candidate exists but is low-for-load / unknown-class / plausible-but-far;
// unfavorable = nothing plausible within coarse range.
export function classifyPower(dep: CandidatePowerDependency | null): DimensionDetail {
  if (!dep) {
    return { rating: "unfavorable", distanceKm: null, reasons: ["no_plausible_power_in_range"] };
  }
  if (dep.distanceKm > POWER_FAR_KM) {
    return { rating: "unfavorable", distanceKm: dep.distanceKm, reasons: dep.reasonCodes };
  }
  const plausible = dep.reasonCodes.includes("voltage_class_plausible");
  const rating = plausible && dep.distanceKm <= POWER_NEAR_KM ? "favorable" : "mixed";
  return { rating, distanceKm: dep.distanceKm, reasons: dep.reasonCodes };
}

// Water: favorable = a source adequate for the demand class (reusing the resolver's
// own `isPlausibleWater` predicate on the OUTPUT fields) is near; mixed = present
// but low-for-load / unknown-class / adequate-but-far; unfavorable = none in range.
export function classifyWater(dep: CandidateWaterDependency | null): DimensionDetail {
  if (!dep) {
    return { rating: "unfavorable", distanceKm: null, reasons: ["no_visible_water_in_range"] };
  }
  if (dep.distanceKm > WATER_FAR_KM) {
    return { rating: "unfavorable", distanceKm: dep.distanceKm, reasons: dep.reasonCodes };
  }
  const adequate = isPlausibleWater(dep.waterClass, dep.demandClass);
  const rating = adequate && dep.distanceKm <= WATER_NEAR_KM ? "favorable" : "mixed";
  return { rating, distanceKm: dep.distanceKm, reasons: dep.reasonCodes };
}

// Flood (low MAPPED risk = favorable): unfavorable = inside a high-severity (SFHA)
// zone; favorable = no mapped zone, or a minimal (X) zone; mixed = near a high/
// unknown zone, or inside an unknown-severity zone. "Favorable" is mapped-risk-only
// — the flood resolver's "absence isn't proof of no risk" caveat still rides along.
export function classifyFlood(risk: CampusFloodRisk): DimensionDetail {
  let rating: DimensionDetail["rating"];
  if (risk.relationship === "inside" && risk.severity === "high") {
    rating = "unfavorable";
  } else if (risk.relationship === "none" || risk.severity === "minimal") {
    rating = "favorable";
  } else {
    rating = "mixed";
  }
  return { rating, distanceKm: risk.distanceKm ?? null, reasons: risk.reasonCodes };
}
