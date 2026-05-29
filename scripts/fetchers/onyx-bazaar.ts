import type { Endpoint } from "../../src/lib/types";
import {
  collectResources,
  mapDiscoveryResource,
  type DiscoveryLike,
} from "../x402-discovery";

// Onyx Bazaar — a free public leaderboard of every paid x402 service indexed
// via the Coinbase CDP discovery API, refreshed every ~15 minutes. It exposes
// a machine-readable JSON variant at /bazaar.json whose entries follow the
// x402 discovery-resource schema. See:
//   https://onyx-actions.onrender.com/bazaar
// Listed in Merit-Systems/awesome-x402.
//
// robots/ToS: a free, public discovery feed intended for programmatic use; we
// fetch a single JSON document once per run (no crawling).

const BAZAAR_URL = "https://onyx-actions.onrender.com/bazaar.json";

export async function fetchOnyxBazaar(): Promise<Endpoint[]> {
  const res = await fetch(BAZAAR_URL, {
    headers: {
      accept: "application/json",
      "user-agent": "x402-endpoint catalog (+https://github.com/kato9292929/endpoint)",
    },
  });

  if (!res.ok) {
    throw new Error(`bazaar.json returned HTTP ${res.status}`);
  }

  const json: unknown = await res.json();

  // bazaar.json may be a flat list, an { items: [] } wrapper, or a 4-view
  // object — collectResources finds resource entries wherever they are and
  // dedups by URL across views.
  const resources: DiscoveryLike[] = collectResources(json);

  const endpoints = resources
    .map((r) =>
      mapDiscoveryResource(r, {
        source: "onyx-bazaar",
        sourceUrl: () => "https://onyx-actions.onrender.com/bazaar",
      }),
    )
    .filter((e): e is Endpoint => e !== null);

  return endpoints;
}
