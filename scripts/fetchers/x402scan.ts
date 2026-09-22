import type { Endpoint } from "../../src/lib/types";
import { canonicalUrl, sleep } from "../util";
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
// robots.txt allows "/" for all agents (and declares ai-input=yes); x402scan
// is explicitly a public discovery layer. We page through with a delay between
// requests and read only public data.
//
// ── Schema notes, verified against the x402scan source (not guessed) ──
// apps/scan/src/trpc/routers/public/resources.ts:
//   list.paginated = paginatedProcedure
//     .input({ where?, sorting?: { id: 'lastUpdated'|'toolCalls', desc }, includeDeprecated? })
// apps/scan/src/lib/pagination.ts:
//   paginatedQuerySchema = { page = 0, page_size = 10 }   ← no upper bound
//   toPaginatedResponse → { items, hasNextPage, total_count, total_pages, page }
// apps/scan/src/services/db/resources/resource.ts:
//   listResourcesWithPaginationUncached → plain Prisma skip/take, no row cap.
//
// Two consequences we rely on:
//  1. There is NO server-side ceiling at 20,000 (or any other number) — the
//     old MAX_ENDPOINTS here was ours alone. We now page to exhaustion.
//  2. `total_count` is returned on every page, so the run can report the API's
//     own total and prove whether it collected all of it.
//
// Ordering: we page `lastUpdated desc`. Under live churn a re-crawled row's
// lastUpdated moves it toward the FRONT, i.e. behind the cursor, which can
// re-serve a row we already have (harmless — we dedupe) but cannot push an
// unseen row past the cursor. Ascending order has the opposite, lossy drift.

const DEFAULT_BASE = "https://x402scan.com";
const PROCEDURE = "public.resources.list.paginated";
const UA = "x402-endpoint catalog (+https://github.com/kato9292929/endpoint)";

// Retry budget per page: 429 and 5xx back off exponentially, other 4xx do not.
const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 30_000;

type Config = {
  base: string;
  pageSize: number;
  gapMs: number;
  safetyMaxRows: number;
};

// Read per run, not at import time, so a caller (and the tests) can change
// these between runs.
function readConfig(): Config {
  return {
    // Overridable only so the paging logic can be exercised against a local
    // fake of x402scan's response shape. Production never sets it.
    base: process.env.X402SCAN_BASE_URL || DEFAULT_BASE,
    // Rows per request. page_size is unbounded upstream and the query is a
    // plain skip/take, so a larger page only means fewer round-trips. 250
    // keeps each response to a few MB while turning a 65k-resource crawl
    // into ~260 requests.
    pageSize: num(process.env.X402SCAN_PAGE_SIZE, 250),
    // Politeness: minimum gap between requests. 0 is allowed for local tests.
    gapMs: num(process.env.X402SCAN_GAP_MS, 1000, 0),
    // Safety net so a pathological response can never loop forever. This is
    // NOT a product cap: if it ever trips, the run is reported as
    // `truncated: true` rather than quietly returning a short catalog.
    safetyMaxRows: num(process.env.X402SCAN_SAFETY_MAX, 200_000),
  };
}

// Sort orders we may page through. Both ids are the full `ResourceSortId`
// enum upstream, so every combination below is schema-valid.
const SORTINGS = [
  { id: "lastUpdated", desc: true },
  { id: "lastUpdated", desc: false },
  { id: "toolCalls", desc: true },
  { id: "toolCalls", desc: false },
] as const;

type Sorting = (typeof SORTINGS)[number];

function num(v: string | undefined, fallback: number, min = 1): number {
  const n = Number(v);
  return v != null && Number.isFinite(n) && n >= min ? n : fallback;
}

function sliceLabel(s: Sorting): string {
  return `${s.id}:${s.desc ? "desc" : "asc"}`;
}

// A page item carries the resource plus x402scan enrichments.
type ScanItem = DiscoveryLike & {
  originId?: string;
  origin?: { id?: string; title?: string | null; description?: string | null } | null;
};

type Paginated = {
  items?: ScanItem[];
  hasNextPage?: boolean;
  total_count?: number;
  total_pages?: number;
  page?: number;
};

// Why a slice stopped. Only "exhausted" means we reached the end of the list.
type StopReason =
  | "exhausted" // hasNextPage went false, or a page came back empty
  | "safety_limit" // SAFETY_MAX_ROWS tripped
  | "page_ceiling" // the API stopped serving rows while hasNextPage was true
  | "page_error"; // a page kept failing after the retry budget

export type X402scanSlice = {
  label: string;
  rows: number; // raw rows the API served for this slice
  added: number; // rows that were new to the union
  pages: number;
  stopped_reason: StopReason;
};

export type X402scanRunMeta = {
  rows: number; // raw rows served across all slices
  mapped: number; // rows that survived mapping into an Endpoint
  pages: number;
  unique_urls: number; // distinct canonical URLs returned
  api_total: number | null; // x402scan's own total_count, when served
  truncated: boolean; // true when the run did NOT reach the end of the list
  stopped_reason: StopReason;
  sliced: boolean; // true when the fallback slices had to run
  slices: X402scanSlice[];
  page_size: number;
  elapsed_ms: number;
  errors: string[];
};

let lastRun: X402scanRunMeta | undefined;

/** Metrics for the most recent fetchX402scan() call, for `fetch_report`. */
export function getLastX402scanRun(): X402scanRunMeta | undefined {
  return lastRun;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
  /** 429 and 5xx are worth another attempt; other 4xx are not. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}

// Build a tRPC v11 (non-batched) GET URL with a superjson-wrapped input.
function trpcUrl(cfg: Config, page: number, sorting: Sorting): string {
  const input = {
    json: {
      pagination: { page, page_size: cfg.pageSize },
      sorting: { id: sorting.id, desc: sorting.desc },
    },
  };
  const q = new URLSearchParams({ input: JSON.stringify(input) });
  return `${cfg.base}/api/trpc/${PROCEDURE}?${q.toString()}`;
}

async function fetchPageOnce(
  cfg: Config,
  page: number,
  sorting: Sorting,
): Promise<Paginated> {
  const res = await fetch(trpcUrl(cfg, page, sorting), {
    headers: { accept: "application/json", "user-agent": UA },
  });
  if (!res.ok) {
    throw new HttpError(
      res.status,
      `tRPC ${PROCEDURE} page ${page} (${sliceLabel(sorting)}) returned HTTP ${res.status}`,
      retryAfterMs(res.headers.get("retry-after")),
    );
  }
  const body: unknown = await res.json();
  // A tRPC error envelope is a 200 in some deployments — surface it.
  const err = (body as { error?: { message?: string } })?.error;
  if (err) {
    throw new Error(
      `tRPC ${PROCEDURE} page ${page} returned an error: ${err.message ?? "unknown"}`,
    );
  }
  // Non-batched superjson response: { result: { data: { json, meta } } }
  const data = (body as { result?: { data?: unknown } })?.result?.data;
  const payload =
    data && typeof data === "object" && "json" in data
      ? (data as { json: unknown }).json
      : data;
  return (payload ?? {}) as Paginated;
}

async function fetchPage(
  cfg: Config,
  page: number,
  sorting: Sorting,
): Promise<Paginated> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchPageOnce(cfg, page, sorting);
    } catch (err) {
      lastErr = err;
      // A network error has no status; treat it as retryable.
      const retryable = err instanceof HttpError ? err.retryable : true;
      if (!retryable || attempt === MAX_ATTEMPTS - 1) break;
      const backoff = Math.min(
        BACKOFF_BASE_MS * 2 ** attempt,
        BACKOFF_CAP_MS,
      );
      const wait =
        err instanceof HttpError && err.retryAfterMs != null
          ? Math.max(err.retryAfterMs, backoff)
          : backoff;
      console.warn(
        `x402scan: page ${page} (${sliceLabel(sorting)}) failed — ${(err as Error).message}; retrying in ${wait}ms`,
      );
      await sleep(wait);
    }
  }
  throw lastErr;
}

function sourceUrl(cfg: Config, item: ScanItem): string {
  const originId = item.originId ?? item.origin?.id;
  return originId
    ? `${cfg.base}/server/${originId}`
    : `${cfg.base}/resources`;
}

type Union = {
  endpoints: Endpoint[];
  seen: Set<string>;
  rows: number;
  mapped: number;
  pages: number;
  apiTotal: number | null;
  errors: string[];
};

// Page one sort order to exhaustion, adding anything new to the union.
async function collectSlice(
  cfg: Config,
  sorting: Sorting,
  union: Union,
  isFirstSlice: boolean,
): Promise<X402scanSlice> {
  const label = sliceLabel(sorting);
  let rows = 0;
  let added = 0;
  let pages = 0;
  let expectingMore = false;
  let reason: StopReason = "exhausted";

  for (let page = 0; ; page++) {
    let res: Paginated;
    try {
      res = await fetchPage(cfg, page, sorting);
    } catch (err) {
      const message = `${label} page ${page}: ${(err as Error).message}`;
      // A page-0 failure on the primary slice is a true failure — the caller
      // needs to see it. Anything deeper must not discard what we already
      // collected (a single deep-page 500 once collapsed the catalog to ~84).
      if (isFirstSlice && page === 0 && union.endpoints.length === 0) throw err;
      union.errors.push(message);
      console.warn(`x402scan: stopping ${label} — ${message}`);
      reason = "page_error";
      break;
    }
    pages++;
    union.pages++;

    const items = res.items ?? [];
    if (typeof res.total_count === "number") union.apiTotal = res.total_count;

    if (items.length === 0) {
      // Empty while the previous page promised more = the API stopped serving
      // depth, not the end of the list.
      reason = expectingMore ? "page_ceiling" : "exhausted";
      break;
    }

    rows += items.length;
    union.rows += items.length;

    for (const item of items) {
      const mapped = mapDiscoveryResource(item, {
        source: "x402scan",
        sourceUrl: () => sourceUrl(cfg, item),
      });
      if (!mapped) continue;
      union.mapped++;
      const key = canonicalUrl(mapped.url);
      if (union.seen.has(key)) continue;
      union.seen.add(key);
      union.endpoints.push(mapped);
      added++;
    }

    if (union.rows >= cfg.safetyMaxRows) {
      console.warn(
        `x402scan: hit the ${cfg.safetyMaxRows}-row safety limit on ${label}; recording the run as truncated.`,
      );
      reason = "safety_limit";
      break;
    }

    expectingMore = res.hasNextPage === true;
    if (!expectingMore) {
      reason = "exhausted";
      break;
    }
    await sleep(cfg.gapMs);
  }

  return { label, rows, added, pages, stopped_reason: reason };
}

export async function fetchX402scan(): Promise<Endpoint[]> {
  const started = Date.now();
  const cfg = readConfig();
  const union: Union = {
    endpoints: [],
    seen: new Set(),
    rows: 0,
    mapped: 0,
    pages: 0,
    apiTotal: null,
    errors: [],
  };

  const slices: X402scanSlice[] = [];
  const primary = await collectSlice(cfg, SORTINGS[0], union, true);
  slices.push(primary);

  // Did the primary pass actually reach the end of the list? Two ways it
  // might not have: it stopped for a non-"exhausted" reason, or it ran out of
  // rows well short of the total x402scan reports. Either way, re-read the
  // list in other sort orders and union by canonical URL — a depth ceiling in
  // one order exposes the far end of the list in the reverse order.
  const shortfall =
    union.apiTotal != null && union.rows < union.apiTotal - cfg.pageSize;
  const needsSlices = primary.stopped_reason !== "exhausted" || shortfall;

  if (needsSlices) {
    console.warn(
      `x402scan: primary pass stopped as "${primary.stopped_reason}" with ${union.rows} row(s)` +
        (union.apiTotal != null ? ` of ${union.apiTotal} reported` : "") +
        "; re-reading in the remaining sort orders.",
    );
    for (const sorting of SORTINGS.slice(1)) {
      await sleep(cfg.gapMs);
      slices.push(await collectSlice(cfg, sorting, union, false));
    }
  }

  // The run is complete only if some slice reached the end of the list and we
  // are not short of the API's own total.
  const reachedEnd = slices.some((s) => s.stopped_reason === "exhausted");
  const stillShort =
    union.apiTotal != null && union.rows < union.apiTotal - cfg.pageSize;
  const stopped =
    slices.find((s) => s.stopped_reason !== "exhausted")?.stopped_reason ??
    "exhausted";

  lastRun = {
    rows: union.rows,
    mapped: union.mapped,
    pages: union.pages,
    unique_urls: union.seen.size,
    api_total: union.apiTotal,
    truncated: !reachedEnd || stillShort,
    stopped_reason: reachedEnd && !stillShort ? "exhausted" : stopped,
    sliced: needsSlices,
    slices,
    page_size: cfg.pageSize,
    elapsed_ms: Date.now() - started,
    errors: union.errors,
  };

  console.log(
    `x402scan: ${union.rows} row(s) over ${union.pages} page(s) → ${union.endpoints.length} unique URL(s)` +
      (union.apiTotal != null ? `; API reports ${union.apiTotal}` : "") +
      `${lastRun.truncated ? " — TRUNCATED" : ""}`,
  );

  return union.endpoints;
}
