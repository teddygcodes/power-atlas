import type { PowerFeatureCollection } from "../../types/geojson";

// Pure / isomorphic GeoJSON helpers.

export function isPowerFeatureCollection(
  value: unknown,
): value is PowerFeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

export function parseFeatureCollection(text: string): PowerFeatureCollection {
  const parsed: unknown = JSON.parse(text);
  if (!isPowerFeatureCollection(parsed)) {
    throw new Error("Parsed value is not a GeoJSON FeatureCollection.");
  }
  return parsed;
}

// Fetch a local GeoJSON file. Uses global fetch (browser + Node 18+); in the
// browser this reads from /public, never from Overpass.
export async function fetchFeatureCollection(
  url: string,
): Promise<PowerFeatureCollection> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isPowerFeatureCollection(data)) {
    throw new Error(`${url} is not a GeoJSON FeatureCollection.`);
  }
  return data;
}
