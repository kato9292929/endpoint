import type { Endpoint } from "../../src/lib/types";

// Fetch merchants from the Visa CLI Merchant Registry (app.visacli.sh/merchants).
//
// TODO: implement. NOTE: this registry is invite-only and it is unclear whether
// the merchant list may be published. Confirm the terms before fetching. If the
// list cannot be republished, this fetcher should stay disabled and the data
// can be maintained manually instead. Map into Endpoint with source:
// ["visa-cli"].
export async function fetchVisaCli(): Promise<Endpoint[]> {
  return [];
}
