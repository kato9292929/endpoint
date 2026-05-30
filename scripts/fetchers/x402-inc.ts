import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Endpoint } from "../../src/lib/types";

// x402 Inc. — self-curated endpoints that x402 Inc. contributes to the catalog.
//
// These are maintained by hand in data/seed/x402-inc.json (PR-based) rather
// than scraped. Modeling them as a fetcher (instead of writing straight into
// data/endpoints.json) means they flow through the same dedupe/merge as every
// other directory: if x402scan or Onyx Bazaar also list one of these URLs, the
// orchestrator unions the sources into e.g. ["x402-inc", "onyx-bazaar"]. It
// also keeps the seed durable across daily rebuilds that overwrite the catalog.
//
// Editorial stance: these are treated exactly like any other source — no
// ranking boost or special placement (see README "Commercial neutrality").

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = join(__dirname, "..", "..", "data", "seed", "x402-inc.json");

export async function fetchX402Inc(): Promise<Endpoint[]> {
  const raw = await readFile(SEED, "utf8");
  const entries = JSON.parse(raw) as Endpoint[];
  // Normalize: ensure source includes "x402-inc" so the merge is correct even
  // if an entry is edited without it.
  return entries.map((e) => ({
    ...e,
    source: e.source?.includes("x402-inc") ? e.source : ["x402-inc"],
  }));
}
