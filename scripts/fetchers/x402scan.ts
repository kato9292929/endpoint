import type { Endpoint } from "../../src/lib/types";
import { sleep } from "../util";
import {
  mapDiscoveryResource,
  type DiscoveryLike,
} from "../x402-discovery";

// x402scan (Merit Systems) — open-source x402 ecosystem explorer.
// github.com/Merit-Systems/x402scan
//
// x402scan's documented REST API (GET /api/x402/resources) is itself an
// x402-PAID endpoint ($0.01/call), so it can't back a free daily job. Instead
// we use the same free, public tRPC query the website itself calls:
//   public.resources.list.paginated
// served at /api/trpc/<path> with the superjson transformer.
//
// robots.txt allows "/" for all agents and x402scan is explicitly a public
// discovery layer; we page through at <=1 req/sec and read only public data.

const BASE = "https://x402scan.com";
const PROCEDURE = "public.resources.list.paginated";
const PAGE_SIZE = 100;
const MAX_PAGES = 200; // safety cap (≈20k resources)

// A page item carries the resource plus x402scan enrichments.
type ScanItem = DiscoveryLike & {
  originId?: string;
  origin?: { id?: string; title?: string | null; description?: string | null } | null;
};

type Paginated = {
  items?: ScanItem[];
  hasNextPage?: boolean;
};

// Build a tRPC v11 (non-batched) GET URL with a superjson-wrapped input.
function trpcUrl(page: number): string {
  const input = {
    json: {
      pagination: { page, page_size: PAGE_SIZE },
      sorting: { id: "lastUpdated", desc: true },
    },
  };
  const q = new URLSearchParams({ input: JSON.stringify(input) });
  return `${BASE}/api/trpc/${PROCEDURE}?${q.toString()}`;
}

async function fetchPage(page: number): Promise<Paginated> {
  const res = await fetch(trpcUrl(page), {
    headers: {
      accept: "application/json",
      "user-agent":
        "x402-endpoint catalog (+https://github.com/kato9292929/endpoint)",
    },
  });
  if (!res.ok) {
    throw new Error(`tRPC ${PROCEDURE} page ${page} returned HTTP ${res.status}`);
  }
  const body: unknown = await res.json();
  // Non-batched superjson response: { result: { data: { json, meta } } }
  const data = (body as { result?: { data?: unknown } })?.result?.data;
  const payload =
    data && typeof data === "object" && "json" in data
      ? (data as { json: unknown }).json
      : data;
  return (payload ?? {}) as Paginated;
}

function sourceUrl(item: ScanItem): string {
  const originId = item.originId ?? item.origin?.id;
  return originId ? `${BASE}/server/${originId}` : `${BASE}/resources`;
}

export async function fetchX402scan(): Promise<Endpoint[]> {
  const endpoints: Endpoint[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const { items, hasNextPage } = await fetchPage(page);
    if (!items || items.length === 0) break;

    for (const item of items) {
      const mapped = mapDiscoveryResource(item, {
        source: "x402scan",
        sourceUrl: () => sourceUrl(item),
      });
      if (mapped) endpoints.push(mapped);
    }

    if (!hasNextPage) break;
    await sleep(1000); // politeness: >=1s between requests
  }

  return endpoints;
}
