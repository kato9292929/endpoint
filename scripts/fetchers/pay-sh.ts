import type { Endpoint } from "../../src/lib/types";

// Fetch endpoints from pay.sh (Solana ecosystem).
//
// TODO: implement. Prefer a public API if available; otherwise scrape only if
// allowed by robots.txt and terms. Throttle to >=1s between requests. Map into
// Endpoint with source: ["pay-sh"].
export async function fetchPaySh(): Promise<Endpoint[]> {
  return [];
}
