// Aggregates every directory fetcher into a single unified catalog and writes
// data/endpoints.json.
//
// Run with: npm run fetch  (tsx scripts/fetch-directories.ts)
//
// Behaviour:
//  - Each fetcher runs independently. If one throws, the others still run, but
//    the outcome is recorded in `fetch_report` — an implemented fetcher that
//    silently returns 0 is detectable (status "empty"), not hidden.
//  - Records are deduped by canonical URL; duplicates across directories are
//    merged so `source` becomes the union of directories the URL was seen in.
//  - `fetch_report` and `popularity_coverage` are ALWAYS written.

import { writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type {
  Catalog,
  Endpoint,
  FetchReportEntry,
  FetchStatus,
} from "../src/lib/types";
import { canonicalUrl, hashId, mergeEndpoints } from "./util";

import { fetchX402Inc } from "./fetchers/x402-inc";
import { fetchX402scan } from "./fetchers/x402scan";
import { fetchOnyxBazaar } from "./fetchers/onyx-bazaar";
import { fetchAgenticMarket } from "./fetchers/agentic-market";
import { fetchPaySh } from "./fetchers/pay-sh";
import { fetchAmpersend } from "./fetchers/ampersend";
import { fetchVisaCli } from "./fetchers/visa-cli";
import { fetchCircleMarketplace } from "./fetchers/circle-marketplace";
import { fetchCommunity } from "./fetchers/community";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "endpoints.json");

type NamedFetcher = {
  name: string;
  run: () => Promise<Endpoint[]>;
  // Implemented fetchers set this true: a 0 result is then "empty" (a bug to
  // surface), not silently accepted. Stub fetchers set it false → "stub".
  expectNonEmpty: boolean;
};

const FETCHERS: NamedFetcher[] = [
  { name: "x402-inc", run: fetchX402Inc, expectNonEmpty: true },
  { name: "x402scan", run: fetchX402scan, expectNonEmpty: true },
  { name: "onyx-bazaar", run: fetchOnyxBazaar, expectNonEmpty: true },
  { name: "pay-sh", run: fetchPaySh, expectNonEmpty: true },
  { name: "agentic-market", run: fetchAgenticMarket, expectNonEmpty: false },
  { name: "ampersend", run: fetchAmpersend, expectNonEmpty: false },
  { name: "visa-cli", run: fetchVisaCli, expectNonEmpty: false },
  {
    name: "circle-marketplace",
    run: fetchCircleMarketplace,
    expectNonEmpty: false,
  },
  { name: "community", run: fetchCommunity, expectNonEmpty: true },
];

type CollectResult = { report: FetchReportEntry[]; endpoints: Endpoint[] };

async function collect(): Promise<CollectResult> {
  const report: FetchReportEntry[] = [];
  const endpoints: Endpoint[] = [];

  for (const f of FETCHERS) {
    try {
      const items = await f.run();
      let status: FetchStatus;
      if (items.length > 0) status = "ok";
      else status = f.expectNonEmpty ? "empty" : "stub";
      report.push({ source: f.name, status, count: items.length });
      const flag = status === "empty" ? "⚠" : status === "stub" ? "·" : "✓";
      console.log(`  ${flag} ${f.name}: ${items.length} (${status})`);
      endpoints.push(...items);
    } catch (err) {
      const error = (err as Error).message;
      report.push({ source: f.name, status: "failed", count: 0, error });
      console.warn(`  ✗ ${f.name}: failed — ${error}`);
    }
  }

  return { report, endpoints };
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
  const { report, endpoints: collected } = await collect();

  // Preserve existing endpoints if a run collected nothing (e.g. everything
  // failed), but still write the report so the failure is visible.
  let endpoints: Endpoint[];
  if (collected.length > 0) {
    endpoints = dedupe(collected);
  } else {
    console.warn(
      "No endpoints collected — preserving existing catalog, recording the failure in fetch_report.",
    );
    try {
      endpoints = (JSON.parse(await readFile(OUT, "utf8")) as Catalog).endpoints;
    } catch {
      endpoints = [];
    }
  }

  const popularity_coverage = endpoints.filter(
    (e) => e.popularity != null,
  ).length;

  const catalog: Catalog = {
    generated_at: new Date().toISOString(),
    count: endpoints.length,
    fetch_report: report,
    popularity_coverage,
    endpoints,
  };

  await writeFile(OUT, JSON.stringify(catalog, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${endpoints.length} endpoint(s); popularity coverage ${popularity_coverage}.`,
  );
  console.table(report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
