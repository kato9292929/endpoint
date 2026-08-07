// Produces data/rank.json — x402scan's most-called origins, re-listed as-is.
//
// Uses the SAME procedure x402scan's own "Top Servers" uses:
//   public.sellers.bazaar.list  (origin-grouped; auth-free; superjson tRPC)
// Schema below is per the verified x402scan source (Merit-Systems/x402scan),
// not guessed. Live response is validated at runtime: an unexpected SUCCESSFUL
// shape throws; a network/HTTP failure yields status "unavailable" (never a
// substitute ordering, never a fake rank).
//
// Run: node --import tsx scripts/fetch-ranking.ts   (npm run fetch:rank)

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "rank.json");

const BASE = "https://x402scan.com";
const PROCEDURE = "public.sellers.bazaar.list";
// timeframe MUST be one of 0/1/7/14/30 — the server builds a materialized-view
// table name from it, so any other value errors. Match x402scan's top view.
const TIMEFRAME_DAYS = 1 as const;
const SORTING_ID = "tx_count" as const; // not "editorial" (that's caller-order)
// LIMIT is applied per-recipient upstream, then folded to origins → page_size 50
// can yield < 50 rows with wrong in-page order. Fetch 200, fold (already
// origin-grouped by bazaar.list), take the top 50.
const FETCH_PAGE_SIZE = 200;
const TOP_N = 50;
const METRIC = `x402scan:${SORTING_ID}:${TIMEFRAME_DAYS}d`;
const UA = "x402-endpoint catalog (+https://github.com/kato9292929/endpoint)";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

type BazaarItem = {
  origins?: { origin?: string; title?: string }[];
  tx_count?: unknown;
  total_amount?: unknown;
  unique_buyers?: unknown;
};

function trpcUrl(): string {
  const input = {
    json: {
      timeframe: TIMEFRAME_DAYS,
      sorting: { id: SORTING_ID, desc: true },
      pagination: { page: 0, page_size: FETCH_PAGE_SIZE },
    },
  };
  const q = new URLSearchParams({ input: JSON.stringify(input) });
  return `${BASE}/api/trpc/${PROCEDURE}?${q.toString()}`;
}

async function writeUnavailable(reason: string) {
  const artifact = {
    generated_at: new Date().toISOString(),
    status: "unavailable" as const,
    metric: null,
    timeframe: TIMEFRAME_DAYS,
    sorting: SORTING_ID,
    rows: [],
  };
  await writeFile(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.warn(`rank: unavailable — ${reason}`);
}

async function main() {
  let body: unknown;
  try {
    const res = await fetch(trpcUrl(), {
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (!res.ok) {
      // Can't fetch → unavailable (expected failure mode), not an exception.
      await writeUnavailable(`HTTP ${res.status}`);
      return;
    }
    body = await res.json();
  } catch (err) {
    await writeUnavailable(`network: ${(err as Error).message}`);
    return;
  }

  // Non-batched superjson: { result: { data: { json, meta } } }
  const data = (body as { result?: { data?: unknown } })?.result?.data;
  const payload =
    data && typeof data === "object" && "json" in data
      ? (data as { json: unknown }).json
      : data;
  const items = (payload as { items?: unknown })?.items;

  // A SUCCESSFUL but unexpected shape is a bug in our assumptions → throw.
  if (!Array.isArray(items)) {
    throw new Error(
      `rank: ${PROCEDURE} returned an unexpected shape (no items array).`,
    );
  }

  const rows = (items as BazaarItem[]).slice(0, TOP_N).map((it, i) => {
    const origin = it.origins?.[0]?.origin;
    if (typeof origin !== "string" || typeof it.tx_count === "undefined") {
      throw new Error(
        `rank: item ${i} missing origins[0].origin or tx_count — schema drift.`,
      );
    }
    return {
      rank: i + 1,
      origin,
      title: it.origins?.[0]?.title ?? hostOf(origin),
      host: hostOf(origin),
      tx_count: num(it.tx_count),
      // x402scan reports settled amount in atomic USDC (6 decimals) → dollars.
      total_amount: num(it.total_amount) / 1e6,
      unique_buyers: num(it.unique_buyers),
      popularity_metric: METRIC,
    };
  });

  const artifact = {
    generated_at: new Date().toISOString(),
    status: "ok" as const,
    metric: METRIC,
    timeframe: TIMEFRAME_DAYS,
    sorting: SORTING_ID,
    rows,
  };
  await writeFile(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.log(`rank: wrote ${rows.length} rows (${METRIC}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
