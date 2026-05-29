import type { Endpoint } from "../../src/lib/types";

// Fetch agents from the Circle Agent Marketplace (agents.circle.com).
//
// TODO: implement. Circle is likely to expose a public API — prefer it over
// scraping. Respect robots.txt and terms; throttle to >=1s between requests.
// Map into Endpoint with source: ["circle-marketplace"].
export async function fetchCircleMarketplace(): Promise<Endpoint[]> {
  return [];
}
