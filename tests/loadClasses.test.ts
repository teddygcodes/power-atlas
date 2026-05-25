import { describe, it, expect } from "vitest";
import { getLoadClass, getLikelyRequirement } from "../lib/power/loadClasses";

describe("load classes", () => {
  it("maps MW to a load class", () => {
    expect(getLoadClass(50)).toBe("moderate");
    expect(getLoadClass(100)).toBe("large");
    expect(getLoadClass(250)).toBe("very_large");
    expect(getLoadClass(500)).toBe("extreme");
  });

  it("maps MW to the exact likely-requirement string", () => {
    expect(getLikelyRequirement(50)).toBe(
      "Utility coordination and interconnection study likely.",
    );
    expect(getLikelyRequirement(100)).toBe(
      "Dedicated utility planning and possible substation work likely.",
    );
    expect(getLikelyRequirement(250)).toBe("Major interconnection and grid upgrade likely.");
    expect(getLikelyRequirement(500)).toBe(
      "Hyperscale load; major transmission-level planning likely.",
    );
  });
});
