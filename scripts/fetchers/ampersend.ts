import type { Endpoint } from "../../src/lib/types";

// Ampersend (Edge & Node) — https://app.ampersend.ai/discover
//
// STATUS: stub (not fetched). Investigated 2026-05.
//
// Ampersend is a "control layer for the agent economy" — a toolkit/registry
// for agents to discover identities and pay per request. The /discover surface
// is a dynamic web app and we found no public, no-auth catalog API:
//   - No documented public REST/JSON discovery endpoint.
//   - The registry appears oriented to authenticated/account use.
//   - Listings are client-rendered, so HTML scraping yields no data.
//
// Leaving this as a stub rather than scraping (project policy). If Ampersend
// publishes a public discovery API, implement it here and map each service to
// the unified Endpoint shape with source: ["ampersend"].
export async function fetchAmpersend(): Promise<Endpoint[]> {
  return [];
}
