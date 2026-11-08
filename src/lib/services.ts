// data/services.json — the catalog grouped into services, read at request
// time so the top of the site follows the daily commit rather than the last
// deployment (see ./live-catalog for why that distinction cost us twelve days).

import servicesJson from "../../data/services.json";

export type ServiceParty = "1P" | "3P";

export type Service = {
  slug: string;
  name: string;
  party: ServiceParty;
  domain: string | null;
  category: string | null;
  endpoints: number;
  priced: number;
  priceMin: number | null;
  priceMedian: number | null;
  networks: string[];
  hosts: string[];
  hostCount: number;
  /** Gateways serving a third party's API. Empty for 1P. */
  via: string[];
  /** Why this one is listed: "brand" | "pay-sh" | "ranked". */
  reasons: string[];
  logo: string | null;
  url: string | null;
};

export type ServicesArtifact = {
  generated_at: string;
  status: string;
  /** Endpoints the selection was made from — the denominator. */
  scanned: number;
  subset: boolean;
  qualifying_reasons?: string[];
  counts: {
    services: number;
    endpoints: number;
    first_party: number;
    third_party: number;
    with_logo: number;
  };
  services: Service[];
};

const RAW_BASE =
  process.env.DATA_RAW_BASE ??
  "https://raw.githubusercontent.com/kato9292929/endpoint/main";
const REVALIDATE_SECONDS = 3600;

function bundled(): ServicesArtifact {
  const raw = servicesJson as unknown as ServicesArtifact;
  return { ...raw, services: raw.services ?? [] };
}

/**
 * The services artifact, fetched per request with the build's copy as the
 * fallback. Never throws: a stale list beats an empty page.
 */
export async function liveServices(): Promise<ServicesArtifact> {
  try {
    const res = await fetch(`${RAW_BASE}/data/services.json`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return bundled();
    const raw = (await res.json()) as Partial<ServicesArtifact>;
    if (!Array.isArray(raw?.services) || raw.services.length === 0) {
      return bundled();
    }
    return { ...bundled(), ...raw } as ServicesArtifact;
  } catch {
    return bundled();
  }
}

/** "From $0.001" / "Free" / "—" — the price a caller would actually meet. */
export function formatFrom(s: Service): string {
  if (s.priceMin == null) return "—";
  if (s.priceMin === 0) return "Free";
  // Small amounts are the norm here; trim the trailing zeros a fixed format
  // would add without rounding a $0.00001 away to nothing.
  const n = s.priceMin;
  const text =
    n < 0.001 ? n.toFixed(5).replace(/0+$/, "") : String(Number(n.toFixed(4)));
  return `From $${text}`;
}

/** A stable tile colour per service, so monograms are not all one shade. */
export function monogramHue(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return h;
}

export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
