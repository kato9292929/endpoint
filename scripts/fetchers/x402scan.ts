import type { Endpoint } from "../../src/lib/types";

// Fetch endpoints from x402scan.com (Merit Systems).
//
// TODO: implement. x402scan is reported to expose a GraphQL API — prefer that
// over HTML scraping. Before scraping, check robots.txt and terms of service,
// and keep at least 1s between requests (see scripts/util.ts `sleep`).
//
// Map each listing into the unified Endpoint shape with source: ["x402scan"]
// and set last_seen to new Date().toISOString().
export async function fetchX402scan(): Promise<Endpoint[]> {
  return [];
}
