// x402 Inc. is the operator of this catalog. Its own endpoints are DISCLOSED
// (a labeled block + a row marker) but NOT rank-boosted: they are never pinned
// to the top of a listing and never reordered within the ranking. See /about.
import type { DirectorySource, Endpoint } from "./types";

export const FEATURED_SOURCE: DirectorySource = "x402-inc";

export function isFeatured(e: Endpoint): boolean {
  return e.source.includes(FEATURED_SOURCE);
}

// Default listing order: most-used first (popularity desc), name as a stable
// tiebreak. NO featured pinning — every endpoint sorts purely on the signal.
// (Popularity currently has ~0 coverage, so this degenerates to name order
// until the ranking surface is wired; see M3-1.)
export function byPopularity(a: Endpoint, b: Endpoint): number {
  const pa = a.popularity ?? -1;
  const pb = b.popularity ?? -1;
  if (pb !== pa) return pb - pa;
  return a.name.localeCompare(b.name);
}

export function defaultOrder(endpoints: Endpoint[]): Endpoint[] {
  return [...endpoints].sort(byPopularity);
}
