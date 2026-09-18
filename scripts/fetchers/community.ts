import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Endpoint } from "../../src/lib/types";

// Community submissions — third-party x402 endpoints contributed by PR.
//
// Hand-maintained in data/seed/community.json (PR-based) rather than scraped,
// following the same pattern as the x402-inc seed. Modeling them as a fetcher
// (instead of writing straight into data/endpoints.json, which the daily job
// overwrites) means they flow through the same dedupe/merge as every other
// directory: if x402scan or another directory also lists one of these URLs,
// the orchestrator unions the sources into e.g. ["community", "x402scan"].

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = join(__dirname, "..", "..", "data", "seed", "community.json");

export async function fetchCommunity(): Promise<Endpoint[]> {
  const raw = await readFile(SEED, "utf8");
  const entries = JSON.parse(raw) as Endpoint[];
  // Normalize: ensure source includes "community" so the merge is correct even
  // if an entry is edited without it.
  return entries.map((e) => ({
    ...e,
    source: e.source?.includes("community") ? e.source : ["community"],
  }));
}
