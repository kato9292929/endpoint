// Reads a catalog file that may be gzipped.
//
// data/endpoints_full.json.gz is committed daily, so it is stored compressed
// (~66 MB of pretty-printed JSON becomes ~5 MB). The page file
// data/endpoints.json stays plain — the Next.js build imports it directly.
//
// Shared by the dependency-free .mjs scripts; scripts/fetch-directories.ts
// does the same thing with node:zlib on the TypeScript side.

import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";

/** Parse a catalog from disk, gunzipping it when the path ends in .gz. */
export function readCatalog(path) {
  const raw = readFileSync(path);
  const text = path.endsWith(".gz")
    ? gunzipSync(raw).toString("utf8")
    : raw.toString("utf8");
  return JSON.parse(text);
}

/**
 * The first of `paths` that exists, or undefined.
 * Callers pass the gzipped full catalog first, then its uncompressed
 * predecessor, so a checkout from either era resolves.
 */
export function firstExisting(...paths) {
  return paths.find((p) => existsSync(p));
}
