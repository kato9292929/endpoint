import type { Endpoint } from "../../src/lib/types";

// Agentic.Market (Coinbase) — https://agentic.market
//
// STATUS: stub (not fetched). Investigated 2026-05.
//
// Agentic.Market is a dynamic Next.js web app and a frontend over Coinbase's
// CDP "Bazaar" discovery index — it turns CDP Bazaar data into searchable
// listings. We found no public, no-auth catalog API to read it directly:
//   - No documented REST/JSON catalog endpoint is published.
//   - The underlying CDP discovery API (api.cdp.coinbase.com) requires a CDP
//     API key.
//   - The listings are client-rendered, so HTML scraping yields no data.
//
// Importantly, the underlying dataset (CDP Bazaar discovery) is already
// surfaced in this catalog via the Onyx Bazaar fetcher, so little is lost by
// leaving this as a stub. If Coinbase publishes a public catalog API, wire it
// here. Per project policy we do not scrape where there's no public API.
export async function fetchAgenticMarket(): Promise<Endpoint[]> {
  return [];
}
