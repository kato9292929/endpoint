import type { Endpoint } from "../../src/lib/types";

// Fetch endpoints from app.ampersend.ai/discover.
//
// TODO: implement. Prefer a public API; scrape /discover only if permitted by
// robots.txt and terms. Throttle to >=1s between requests. Map into Endpoint
// with source: ["ampersend"].
export async function fetchAmpersend(): Promise<Endpoint[]> {
  return [];
}
