import type { Endpoint } from "../../src/lib/types";

// Fetch endpoints from agentic.market (Base ecosystem).
//
// TODO: implement. Check for a public/GraphQL API first; fall back to scraping
// only if permitted by robots.txt and the terms of service. Throttle to >=1s
// between requests. Map into Endpoint with source: ["agentic-market"].
export async function fetchAgenticMarket(): Promise<Endpoint[]> {
  return [];
}
