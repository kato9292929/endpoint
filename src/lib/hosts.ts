// Host aggregation. The catalog counts ROUTES, not services: 19k routes come
// from ~1k hosts, heavily concentrated (top host alone is ~10%). /hosts and the
// homepage surface this so "19k endpoints" reads honestly.
import { getEndpoints } from "./data";
import type { Category, Endpoint } from "./types";

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export type HostAgg = {
  host: string;
  count: number; // number of routes on this host
  categories: Partial<Record<Category, number>>;
  topCategory: Category | null;
  priceMedian: number | null; // USDC, over routes that state a price
  sampleId: string; // an endpoint id on this host (for linking)
};

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Pure aggregation (fixture-testable).
export function aggregateHosts(endpoints: Endpoint[]): HostAgg[] {
  const map = new Map<
    string,
    { count: number; cats: Record<string, number>; prices: number[]; sampleId: string }
  >();
  for (const e of endpoints) {
    const host = hostOf(e.url);
    let a = map.get(host);
    if (!a) {
      a = { count: 0, cats: {}, prices: [], sampleId: e.id };
      map.set(host, a);
    }
    a.count++;
    a.cats[e.category] = (a.cats[e.category] ?? 0) + 1;
    if (typeof e.price?.amount === "number") a.prices.push(e.price.amount);
  }

  const out: HostAgg[] = [];
  for (const [host, a] of map) {
    const topCategory =
      (Object.entries(a.cats).sort((x, y) => y[1] - x[1])[0]?.[0] as
        | Category
        | undefined) ?? null;
    out.push({
      host,
      count: a.count,
      categories: a.cats as Partial<Record<Category, number>>,
      topCategory,
      priceMedian: median(a.prices),
      sampleId: a.sampleId,
    });
  }
  return out.sort((x, y) => y.count - x.count || x.host.localeCompare(y.host));
}

export function getHosts(): HostAgg[] {
  return aggregateHosts(getEndpoints());
}

export function getHostCount(): number {
  return new Set(getEndpoints().map((e) => hostOf(e.url))).size;
}

// Share of routes held by the top-N hosts (0..1).
export function topHostShare(n: number): number {
  const hosts = getHosts();
  const total = hosts.reduce((s, h) => s + h.count, 0);
  if (total === 0) return 0;
  const top = hosts.slice(0, n).reduce((s, h) => s + h.count, 0);
  return top / total;
}
