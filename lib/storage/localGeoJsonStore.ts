import "../serverOnly"; // filesystem writers must never reach the browser bundle
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Write JSON to disk, creating parent dirs. Returns the byte size written.
// `pretty` for small human-read files (manifest); compact for large GeoJSON.
export function writeJsonFile(
  filePath: string,
  data: unknown,
  pretty = false,
): number {
  mkdirSync(dirname(filePath), { recursive: true });
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  writeFileSync(filePath, json, "utf8");
  return Buffer.byteLength(json, "utf8");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
