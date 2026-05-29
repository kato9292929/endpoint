// Aggregates every directory fetcher into a single unified catalog and writes
// data/endpoints.json.
//
// Run with: npm run fetch  (tsx scripts/fetch-directories.ts)
//
// Behaviour:
//  - Each fetcher runs independently. If one throws, it is skipped with a
//    warning and the others still run (a failed directory must not break the
//    whole batch).
//  - Records are deduped by canonical URL; duplicates across directories are
//    merged so `source` becomes the union of directories the URL was seen in.
//  - If every fetcher returns nothing (e.g. all still TODO), the existing
//    data/endpoints.json is left untouched so the sample/seed data survives.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Catalog, Endpoint } from "../src/lib/types";
import { canonicalUrl, hashId, mergeEndpoints } from "./util";

import { fetchX402scan } from "./fetchers/x402scan";
import { fetchOnyxBazaar } from "./fetchers/onyx-bazaar";
import { fetchAgenticMarket } from "./fetchers/agentic-market";
import { fetchPaySh } from "./fetchers/pay-sh";
import { fetchAmpersend } from "./fetchers/ampersend";
import { fetchVisaCli } from "./fetchers/visa-cli";
import { fetchCircleMarketplace } from "./fetchers/circle-marketplace";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "endpoints.json");

type NamedFetcher = {
  name: string;
  run: () => Promise<Endpoint[]>;
};

const FETCHERS: NamedFetcher[] = [
  { name: "x402scan", run: fetchX402scan },
  { name: "onyx-bazaar", run: fetchOnyxBazaar },
  { name: "agentic-market", run: fetchAgenticMarket },
  { name: "pay-sh", run: fetchPaySh },
  { name: "ampersend", run: fetchAmpersend },
  { name: "visa-cli", run: fetchVisaCli },
  { name: "circle-marketplace", run: fetchCircleMarketplace },
];

async function collect(): Promise<Endpoint[]> {
  const all: Endpoint[] = [];
  for (const f of FETCHERS) {
    try {
      const items = await f.run();
      console.log(`  ✓ ${f.name}: ${items.length} endpoint(s)`);
      all.push(...items);
    } catch (err) {
      console.warn(`  ✗ ${f.name}: skipped — ${(err as Error).message}`);
    }
  }
  return all;
}

// Dedup by canonical URL, normalize ids, and merge cross-directory duplicates.
function dedupe(endpoints: Endpoint[]): Endpoint[] {
  const byUrl = new Map<string, Endpoint>();
  for (const raw of endpoints) {
    const key = canonicalUrl(raw.url);
    const e: Endpoint = { ...raw, id: raw.id || hashId(raw.url) };
    const existing = byUrl.get(key);
    byUrl.set(key, existing ? mergeEndpoints(existing, e) : e);
  }
  return [...byUrl.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  console.log("Fetching x402 directories…");
  const collected = await collect();

  if (collected.length === 0) {
    console.log(
      "No endpoints fetched (fetchers are still stubs). Leaving existing data/endpoints.json untouched.",
    );
    try {
      const current = JSON.parse(await readFile(OUT, "utf8")) as Catalog;
      console.log(`Existing catalog has ${current.count} endpoint(s).`);
    } catch {
      // No existing file — that's fine.
    }
    return;
  }

  const endpoints = dedupe(collected);
  const catalog: Catalog = {
    generated_at: new Date().toISOString(),
    count: endpoints.length,
    endpoints,
  };

  await writeFile(OUT, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(`Wrote ${endpoints.length} endpoint(s) to data/endpoints.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
