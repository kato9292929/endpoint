// Server-side helpers for reading the unified catalog.
// Pages import these in server components; the JSON is bundled at build time.

import catalogJson from "../../data/endpoints.json";
import {
  type Catalog,
  type Category,
  type DirectorySource,
  type Endpoint,
} from "./types";

const catalog = catalogJson as Catalog;

export function getCatalog(): Catalog {
  return catalog;
}

export function getEndpoints(): Endpoint[] {
  return catalog.endpoints;
}

export function getEndpointById(id: string): Endpoint | undefined {
  return catalog.endpoints.find((e) => e.id === id);
}

export function getByCategory(category: Category): Endpoint[] {
  return catalog.endpoints.filter((e) => e.category === category);
}

export function getByNetwork(network: string): Endpoint[] {
  const n = network.toLowerCase();
  return catalog.endpoints.filter((e) =>
    e.networks.some((x) => x.toLowerCase() === n),
  );
}

export function getBySource(source: DirectorySource): Endpoint[] {
  return catalog.endpoints.filter((e) => e.source.includes(source));
}

// Distinct networks present in the catalog, sorted by frequency desc.
export function getNetworks(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of catalog.endpoints) {
    for (const n of e.networks) {
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getCategoryCounts(): Record<Category, number> {
  const counts = {
    data: 0,
    compute: 0,
    search: 0,
    media: 0,
    trading: 0,
    messaging: 0,
    other: 0,
  } as Record<Category, number>;
  for (const e of catalog.endpoints) counts[e.category]++;
  return counts;
}

export function getSourceCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of catalog.endpoints) {
    for (const s of e.source) counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

export function getProtocols(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of catalog.endpoints) {
    for (const p of e.protocols) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatPrice(e: Endpoint): string | null {
  if (!e.price) return null;
  const { amount, currency, unit } = e.price;
  const a = amount === 0 ? "Free" : `${amount} ${currency}`;
  return amount === 0 ? "Free" : `${a} / ${unit}`;
}

// Slugs used in network/[name] routes are lowercased network names.
export function networkSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
