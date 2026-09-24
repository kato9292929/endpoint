// Named providers — companies serving x402 from a domain they control.
//
// Read AS-IS from data/providers.json, produced by
// scripts/write-providers.mjs against the FULL catalog. It has to be a
// pre-built artifact rather than something computed here: the site bundles
// data/endpoints.json, which is capped at 20,000 of ~105,000 endpoints, so
// deriving this list at render time would silently understate it.
//
// The rule the artifact encodes (see scripts/brands.mjs): a host counts as a
// company's own only when it sits under a domain that company controls.
// Endpoints published through a gateway operator, or on shared hosting, are
// excluded — whatever the listing calls itself.
import providersJson from "../../data/providers.json";
import type { Category } from "./types";

export type ProviderRow = {
  /** Set when the host belongs to a company a reader would recognize. */
  brand: string | null;
  host: string;
  /** Most common endpoint name on the host — the service, not one route. */
  name: string;
  count: number;
  priced: number;
  priceMedian: number | null;
  topCategory: Category | null;
  networks: string[];
  sources: string[];
  sampleId: string;
  url: string;
};

export type ProvidersArtifact = {
  generated_at: string;
  status: "ok" | "unavailable";
  source: string;
  scanned: number;
  subset: boolean;
  /** Recognizable companies, on their own domain. */
  firstParty: ProviderRow[];
  /** pay-skills providers on their own domain rather than via a gateway. */
  selfHosted: ProviderRow[];
};

const raw = providersJson as ProvidersArtifact;

export function getProviders(): ProvidersArtifact {
  return {
    ...raw,
    // Tolerate an artifact written before a field existed.
    subset: raw.subset ?? false,
    firstParty: raw.firstParty ?? [],
    selfHosted: raw.selfHosted ?? [],
  };
}

export function formatProviderPrice(row: ProviderRow): string {
  if (row.priceMedian == null) return "—";
  return row.priceMedian < 1
    ? `$${row.priceMedian}`
    : `$${row.priceMedian.toLocaleString()}`;
}
