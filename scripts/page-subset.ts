// Which endpoints the site's bundled catalog (data/endpoints.json) may carry.
//
// Kept in its own module because scripts/fetch-directories.ts runs the live
// fetch on import — importing this from a test must never do that.

import type { Endpoint } from "../src/lib/types";

// src/lib/data.ts imports data/endpoints.json at build time and
// src/app/page.tsx hands it to a client component, so every byte of that file
// lands in the page payload. 20,000 is the cap the x402scan fetcher used to
// stop at, kept here so the deployed bundle does not change size: ~19k
// endpoints is the proven-safe figure against Vercel's ~19 MB ISR limit.
//
// Raising it is a front-end decision (move search to /api/search and paginate
// the list server-side first), not a fetch-layer one. The full catalog lives
// in data/endpoints_full.json and is what data/stats/*.json counts.
export const PAGE_SUBSET_MAX = 20_000;

export const SUBSET_RULE =
  "every non-x402scan endpoint, then the most recently updated x402scan ones (last_seen desc) up to subset_limit";

/**
 * Pick the endpoints the page file may carry.
 *
 * The old behaviour was "the first 20,000 x402scan rows by lastUpdated desc",
 * so the freshest 20,000 is what keeps the deployed page equivalent. Two
 * departures, both deliberate:
 *  - Endpoints from the other directories are always kept. There are under a
 *    hundred of them, and the x402-inc seed is featured in the UI — dropping
 *    it because its last_seen is old would be a visible regression.
 *  - Selection happens after the cross-source merge, so a URL that several
 *    directories list counts once and is never dropped as "just x402scan".
 */
export function pageSubset(
  endpoints: Endpoint[],
  limit = PAGE_SUBSET_MAX,
): Endpoint[] {
  if (endpoints.length <= limit) return endpoints;

  const others: Endpoint[] = [];
  const scan: Endpoint[] = [];
  for (const e of endpoints) {
    (e.source.length === 1 && e.source[0] === "x402scan" ? scan : others).push(e);
  }

  // Freshest first, then fill whatever room the other directories leave.
  scan.sort((a, b) => b.last_seen.localeCompare(a.last_seen));
  const room = Math.max(0, limit - others.length);
  return [...others, ...scan.slice(0, room)].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
