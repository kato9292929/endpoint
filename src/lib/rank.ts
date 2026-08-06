// x402scan "most-called" ranking = upstream popularity re-listed as-is. We do
// NOT synthesize a score or reorder. If no endpoint carries a popularity signal
// (the x402scan call-count surface isn't wired yet — see M3-1), the ranking is
// UNAVAILABLE and returns empty; we never fall back to catalog/name/count order.
import { getEndpoints } from "./data";
import { hostOf } from "./hosts";
import type { Category, DirectorySource, Endpoint, Price } from "./types";

export type RankRow = {
  rank: number;
  id: string;
  name: string;
  host: string;
  popularity: number;
  popularity_metric?: string;
  category: Category;
  price?: Price;
  networks: string[];
  source: DirectorySource[];
};

export type RankResult = {
  status: "ok" | "unavailable";
  metric: string | null; // what the number counts, e.g. "x402scan:toolCalls"
  rows: RankRow[];
};

// Pure ranking (fixture-testable).
export function rankFrom(endpoints: Endpoint[], limit = 50): RankResult {
  const n = Math.max(1, Math.min(50, limit));
  const withPop = endpoints.filter((e) => typeof e.popularity === "number");
  if (withPop.length === 0) {
    return { status: "unavailable", metric: null, rows: [] };
  }
  const sorted = [...withPop].sort(
    (a, b) => (b.popularity as number) - (a.popularity as number),
  );
  const metric = sorted.find((e) => e.popularity_metric)?.popularity_metric ?? null;
  const rows: RankRow[] = sorted.slice(0, n).map((e, i) => ({
    rank: i + 1,
    id: e.id,
    name: e.name,
    host: hostOf(e.url),
    popularity: e.popularity as number,
    popularity_metric: e.popularity_metric,
    category: e.category,
    price: e.price,
    networks: e.networks,
    source: e.source,
  }));
  return { status: "ok", metric, rows };
}

export function getRank(limit = 50): RankResult {
  return rankFrom(getEndpoints(), limit);
}
