import { createHash } from "node:crypto";
import type { Endpoint } from "../src/lib/types";

// Canonicalize a URL for dedup: lowercase host, strip trailing slash,
// drop default ports and fragments. Best-effort — falls back to raw string.
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.host = u.host.toLowerCase();
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim().replace(/\/+$/, "");
  }
}

export function hashId(url: string): string {
  return createHash("sha256")
    .update(canonicalUrl(url))
    .digest("hex")
    .slice(0, 16);
}

// Politeness helper for fetchers that scrape: at least 1s between requests.
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Merge two records for the same canonical URL. Sources and arrays are unioned.
export function mergeEndpoints(a: Endpoint, b: Endpoint): Endpoint {
  const union = (x: string[], y: string[]) => [...new Set([...x, ...y])];
  // Keep the more recently seen record's scalar fields.
  const newer = a.last_seen >= b.last_seen ? a : b;
  const older = newer === a ? b : a;
  return {
    ...older,
    ...newer,
    networks: union(a.networks, b.networks),
    protocols: union(a.protocols, b.protocols),
    source: union(a.source, b.source) as Endpoint["source"],
    // Prefer a description if the newer one is empty.
    description: newer.description || older.description,
    price: newer.price ?? older.price,
  };
}
