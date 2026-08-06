// Host aggregation. The catalog counts ROUTES, not services: ~19k routes come
// from ~1k hosts, and the top hosts are single services that expand one dataset
// or wrapper into hundreds–thousands of per-query routes. So a host's route
// count reflects the GRANULARITY of its route expansion, not the operator's
// size. /hosts and the homepage surface the service name to make this readable.
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
  serviceName: string; // most common endpoint `name` on the host
  count: number; // number of routes on this host
  share: number; // count / total routes (0..1)
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

function mode(counts: Record<string, number>, fallback: string): string {
  return (
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback
  );
}

// Pure aggregation (fixture-testable).
export function aggregateHosts(endpoints: Endpoint[]): HostAgg[] {
  const map = new Map<
    string,
    {
      count: number;
      cats: Record<string, number>;
      names: Record<string, number>;
      prices: number[];
      sampleId: string;
    }
  >();
  for (const e of endpoints) {
    const host = hostOf(e.url);
    let a = map.get(host);
    if (!a) {
      a = { count: 0, cats: {}, names: {}, prices: [], sampleId: e.id };
      map.set(host, a);
    }
    a.count++;
    a.cats[e.category] = (a.cats[e.category] ?? 0) + 1;
    a.names[e.name] = (a.names[e.name] ?? 0) + 1;
    if (typeof e.price?.amount === "number") a.prices.push(e.price.amount);
  }

  const total = endpoints.length || 1;
  const out: HostAgg[] = [];
  for (const [host, a] of map) {
    const topCategory =
      (Object.entries(a.cats).sort((x, y) => y[1] - x[1])[0]?.[0] as
        | Category
        | undefined) ?? null;
    out.push({
      host,
      serviceName: mode(a.names, host),
      count: a.count,
      share: a.count / total,
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

// Median routes-per-host, and the count of hosts with exactly one route.
export function hostStats(): {
  hostCount: number;
  totalRoutes: number;
  routesPerHostMedian: number | null;
  singleRouteHosts: number;
} {
  const hosts = getHosts();
  const counts = hosts.map((h) => h.count);
  return {
    hostCount: hosts.length,
    totalRoutes: counts.reduce((s, n) => s + n, 0),
    routesPerHostMedian: median(counts),
    singleRouteHosts: hosts.filter((h) => h.count === 1).length,
  };
}
