// The ranking = x402scan's most-called origins, re-listed AS-IS from
// data/rank.json (produced daily by scripts/fetch-ranking.ts). We never
// synthesize a score, reorder, or substitute catalog/name/count order. When the
// artifact is unavailable, the ranking is empty and status "unavailable".
import rankJson from "../../data/rank.json";
import { getEndpoints } from "./data";
import { hostOf } from "./hosts";
import type { Category, Endpoint, Price } from "./types";

// Row as produced by the fetcher (numbers are x402scan's).
export type RankArtifactRow = {
  rank: number;
  origin: string;
  title: string;
  host: string;
  tx_count: number;
  total_amount: number;
  unique_buyers: number;
  popularity_metric: string;
};

export type RankArtifact = {
  generated_at: string;
  status: "ok" | "unavailable";
  metric: string | null;
  timeframe: number;
  sorting: string;
  rows: RankArtifactRow[];
};

// Display row = artifact row + catalog join (host-level; absent if the origin
// isn't in our catalog).
export type RankRow = RankArtifactRow & {
  category: Category | null;
  price: Price | null;
  networks: string[];
};

export type RankResult = {
  status: "ok" | "unavailable";
  metric: string | null;
  timeframe: number;
  sorting: string;
  generated_at: string;
  rows: RankRow[];
};

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Pure builder (fixture-testable): join artifact rows to catalog by host.
export function buildRankRows(
  artifact: RankArtifact,
  endpoints: Endpoint[],
  limit = 50,
): RankResult {
  const base = {
    status: artifact.status,
    metric: artifact.metric,
    timeframe: artifact.timeframe,
    sorting: artifact.sorting,
    generated_at: artifact.generated_at,
  };
  if (artifact.status !== "ok") return { ...base, rows: [] };

  const byHost = new Map<string, Endpoint[]>();
  for (const e of endpoints) {
    const h = hostOf(e.url);
    (byHost.get(h) ?? byHost.set(h, []).get(h)!).push(e);
  }

  const n = Math.max(1, Math.min(50, limit));
  const rows: RankRow[] = artifact.rows.slice(0, n).map((r) => {
    const eps = byHost.get(r.host) ?? [];
    const cats: Record<string, number> = {};
    const nets = new Set<string>();
    const prices: number[] = [];
    for (const e of eps) {
      cats[e.category] = (cats[e.category] ?? 0) + 1;
      for (const net of e.networks) nets.add(net);
      if (typeof e.price?.amount === "number") prices.push(e.price.amount);
    }
    const topCat =
      (Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] as
        | Category
        | undefined) ?? null;
    const pm = median(prices);
    return {
      ...r,
      category: topCat,
      price: pm == null ? null : { amount: pm, currency: "USDC", unit: "per-call" },
      networks: [...nets],
    };
  });

  return { ...base, rows };
}

export function getRank(limit = 50): RankResult {
  return buildRankRows(rankJson as RankArtifact, getEndpoints(), limit);
}
