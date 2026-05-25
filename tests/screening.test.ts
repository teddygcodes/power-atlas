import { describe, it, expect } from "vitest";
import { generateGrid } from "../lib/screening/grid";
import { classifyPower, classifyWater, classifyFlood } from "../lib/screening/classify";
import { screenRegion, SCREENING_CAVEAT, SCREENING_BBOX } from "../lib/screening/screen";
import { resolveCandidatePowerDependency } from "../lib/power/dependencyResolver";
import { resolveCandidateWaterDependency } from "../lib/water/waterResolver";
import { resolveCampusFloodRisk } from "../lib/flood/floodResolver";
import { representativeCoordinate } from "../lib/geo/centroid";
import { emptyFeatureCollection, emptyWaterFeatureCollection, emptyFloodFeatureCollection } from "../types/geojson";
import type { PowerFeatureCollection, WaterFeatureCollection, FloodFeatureCollection } from "../types/geojson";
import powerRaw from "./fixtures/georgia-demo-sample.json";
import waterRaw from "./fixtures/georgia-demo-water-sample.json";
import floodRaw from "./fixtures/georgia-demo-flood-sample.json";

const power = powerRaw as unknown as {
  substations: PowerFeatureCollection;
  transmissionLines: PowerFeatureCollection;
};
const water = waterRaw as unknown as WaterFeatureCollection;
const flood = floodRaw as unknown as {
  zones: FloodFeatureCollection;
  testPoints: { inside: [number, number]; near: [number, number]; none: [number, number] };
};

describe("generateGrid", () => {
  it("produces cells whose centers lie within the bbox", () => {
    const [s, w, n, e] = SCREENING_BBOX;
    const cells = generateGrid(SCREENING_BBOX, 0.1);
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) {
      expect(c.center[0]).toBeGreaterThanOrEqual(w);
      expect(c.center[0]).toBeLessThanOrEqual(e);
      expect(c.center[1]).toBeGreaterThanOrEqual(s);
      expect(c.center[1]).toBeLessThanOrEqual(n);
      expect(c.polygon).toHaveLength(5); // closed ring
    }
  });

  it("denser spacing yields more cells", () => {
    expect(generateGrid(SCREENING_BBOX, 0.05).length).toBeGreaterThan(
      generateGrid(SCREENING_BBOX, 0.1).length,
    );
  });
});

describe("per-dimension classification on REAL fixtures", () => {
  it("power: a cell next to a plausible substation → favorable", () => {
    const sub = power.substations.features.find((s) => s.properties.osmId === "way/34771030")!; // 230kV
    const c = representativeCoordinate(sub)!;
    const dep = resolveCandidatePowerDependency({
      scenario: { campusSizeMW: 100, coordinates: [c[0] + 0.003, c[1] + 0.003] },
      substations: power.substations,
      transmissionLines: power.transmissionLines,
    });
    const screen = classifyPower(dep);
    expect(screen.rating).toBe("favorable");
    expect(screen.reasons).toContain("voltage_class_plausible");
  });

  it("power: nothing within coarse range → unfavorable", () => {
    // Campus far out in the ocean — no fixture substation within range.
    const dep = resolveCandidatePowerDependency({
      scenario: { campusSizeMW: 100, coordinates: [-80.0, 32.0] },
      substations: power.substations,
      transmissionLines: power.transmissionLines,
    });
    expect(classifyPower(dep).rating).toBe("unfavorable");
  });

  it("power: no candidate at all → unfavorable", () => {
    const dep = resolveCandidatePowerDependency({
      scenario: { campusSizeMW: 100, coordinates: [-84.4, 33.7] },
      substations: emptyFeatureCollection(),
      transmissionLines: emptyFeatureCollection(),
    });
    expect(classifyPower(dep).rating).toBe("unfavorable");
  });

  it("flood: a cell inside a real AE zone → unfavorable", () => {
    const risk = resolveCampusFloodRisk({
      scenario: { campusSizeMW: 100, coordinates: flood.testPoints.inside },
      floodZones: flood.zones,
    });
    const screen = classifyFlood(risk);
    expect(screen.rating).toBe("unfavorable");
    expect(screen.reasons).toContain("campus_inside_mapped_flood_zone");
  });

  it("flood: no mapped zone nearby → favorable (low MAPPED risk)", () => {
    const risk = resolveCampusFloodRisk({
      scenario: { campusSizeMW: 100, coordinates: flood.testPoints.none },
      floodZones: flood.zones,
    });
    expect(classifyFlood(risk).rating).toBe("favorable");
  });

  it("water: a cell next to an adequate source → favorable; far → unfavorable", () => {
    const river = water.features.find((w) => w.properties.osmId === "way/484301357")!; // Chattahoochee (major_river)
    const rc = representativeCoordinate(river)!;
    const near = resolveCandidateWaterDependency({
      scenario: { campusSizeMW: 100, coordinates: [rc[0] + 0.002, rc[1] + 0.002], coolingType: "hybrid" },
      waterFeatures: water,
    });
    expect(classifyWater(near).rating).toBe("favorable");

    const far = resolveCandidateWaterDependency({
      scenario: { campusSizeMW: 100, coordinates: [-80.0, 32.0], coolingType: "hybrid" },
      waterFeatures: water,
    });
    expect(classifyWater(far).rating).toBe("unfavorable");
  });
});

describe("screenRegion AND-gate + framing guarantees", () => {
  const result = screenRegion({
    campusSizeMW: 250,
    coolingType: "evaporative",
    substations: power.substations,
    transmissionLines: power.transmissionLines,
    water,
    flood: flood.zones,
  });

  it("worthInvestigating is a strict AND — unfavorable on ANY dimension disqualifies", () => {
    for (const cell of result.cells) {
      const expected =
        cell.power.rating !== "unfavorable" &&
        cell.water.rating !== "unfavorable" &&
        cell.flood.rating !== "unfavorable";
      expect(cell.worthInvestigating).toBe(expected);
      if (
        cell.power.rating === "unfavorable" ||
        cell.water.rating === "unfavorable" ||
        cell.flood.rating === "unfavorable"
      ) {
        expect(cell.worthInvestigating).toBe(false);
      }
    }
  });

  it("emits NO composite score / rank / index — only the three rating enums + a boolean", () => {
    // Scope to the cell DATA (the caveat is asserted separately).
    const cells = JSON.stringify(result.cells);
    expect(cells).not.toMatch(/suitabilit|score|ranked|rank\b|index|weighted|composite/i);
    for (const cell of result.cells) {
      for (const dim of [cell.power, cell.water, cell.flood]) {
        expect(["favorable", "mixed", "unfavorable"]).toContain(dim.rating);
      }
      expect(typeof cell.worthInvestigating).toBe("boolean");
    }
  });

  it("cell data contains NO prescription language", () => {
    // The cells/ratings/reasons must never say best/recommended/optimal/ranked.
    // (The standing caveat deliberately says "not a site recommendation" — asserted below.)
    const cells = JSON.stringify(result.cells);
    expect(cells).not.toMatch(/\bbest\b|recommend|optimal|top pick|build here|winner/i);
  });

  it("ALWAYS carries the standing caveat (which itself disclaims recommendation)", () => {
    expect(result.caveat).toBe(SCREENING_CAVEAT);
    expect(result.caveat).toMatch(/not a site recommendation/i);
    expect(result.caveat).toMatch(/Verify everything externally/i);
  });

  it("runs over the whole grid (coarse, many cells)", () => {
    expect(result.cells.length).toBeGreaterThan(20);
  });
});
