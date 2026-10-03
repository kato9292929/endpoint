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
//
// Patient on purpose. x402scan has been answering some requests with HTTP 500
// since early October — not a rate limit, and not depth-related (the failures
// arrive at `skip 0`). A burst can outlast a short budget, and giving up on
// one page used to abandon the whole crawl: 4,105 endpoints collected out of
// 133,429 on 2026-10-03.
const MAX_ATTEMPTS = 8;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 60_000;

// A page that stays broken is a hole, not the end of the list. Step over it and
// keep going; only give up once the holes say the source itself is down.
const MAX_SKIPPED_PAGES = 20;

// Retry budget per page, patient on purpose. x402scan has been answering some
// requests with HTTP 500 since early October — not a rate limit, and not
// depth-related (the failures arrive at `skip 0`). A burst can outlast a short
// budget, and giving up on one page used to abandon the whole crawl: 4,105
// endpoints collected out of 133,429 on 2026-10-03.
const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_BACKOFF_BASE_MS = 1000;
const DEFAULT_BACKOFF_CAP_MS = 60_000;

type Config = {
  base: string;
  pageSize: number;
  gapMs: number;
  safetyMaxRows: number;
  /**
   * Page by a `lastUpdated` cursor instead of a growing `skip`.
   *
   * The upstream query is `skip: page * page_size`, so plain offset paging
   * asks for `OFFSET 125000` by the end of a 500-page crawl. That is what
   * broke on 2026-10-01..03: the crawl died mid-run (`page_error`) earlier
   * each day as the directory grew, after years of working. A cursor keeps
   * every request at `skip: 0` and filters with
   * `where: { lastUpdated: { lte: cursor } }` instead — the `where` field is
   * a pass-through Prisma filter on the upstream procedure.
   */
  keyset: boolean;
  maxAttempts: number;
  backoffBaseMs: number;
  backoffCapMs: number;
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
    keyset: process.env.X402SCAN_PAGING !== "offset",
    maxAttempts: num(process.env.X402SCAN_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS),
    backoffBaseMs: num(process.env.X402SCAN_BACKOFF_MS, DEFAULT_BACKOFF_BASE_MS),
    backoffCapMs: num(
      process.env.X402SCAN_BACKOFF_CAP_MS,
      DEFAULT_BACKOFF_CAP_MS,
    ),
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
  /** Pages that stayed broken and were stepped over rather than aborted on. */
  skipped_pages: number;
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
type PageRequest = { page: number; where?: Record<string, unknown> };

function trpcUrl(cfg: Config, req: PageRequest, sorting: Sorting): string {
  const input = {
    json: {
      pagination: { page: req.page, page_size: cfg.pageSize },
      sorting: { id: sorting.id, desc: sorting.desc },
      ...(req.where ? { where: req.where } : {}),
    },
  };
  const q = new URLSearchParams({ input: JSON.stringify(input) });
  return `${cfg.base}/api/trpc/${PROCEDURE}?${q.toString()}`;
}

/** A stable identity for a row — the upstream keys rows by URL + method. */
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function rowKey(item: ScanItem): string {
  const url = item.resource ?? item.url ?? "";
  const method = (item as { method?: string }).method ?? "";
  return `${url}\u0000${method}`;
}

async function fetchPageOnce(
  cfg: Config,
  req: PageRequest,
  sorting: Sorting,
): Promise<Paginated> {
  const res = await fetch(trpcUrl(cfg, req, sorting), {
    headers: { accept: "application/json", "user-agent": UA },
  });
  if (!res.ok) {
    throw new HttpError(
      res.status,
      `tRPC ${PROCEDURE} page ${req.page} (${sliceLabel(sorting)}) returned HTTP ${res.status}`,
      retryAfterMs(res.headers.get("retry-after")),
    );
  }
  const body: unknown = await res.json();
  // A tRPC error envelope is a 200 in some deployments — surface it.
  const err = (body as { error?: { message?: string } })?.error;
  if (err) {
    throw new Error(
      `tRPC ${PROCEDURE} page ${req.page} returned an error: ${err.message ?? "unknown"}`,
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
  req: PageRequest,
  sorting: Sorting,
): Promise<Paginated> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    try {
      return await fetchPageOnce(cfg, req, sorting);
    } catch (err) {
      lastErr = err;
      // A network error has no status; treat it as retryable.
      const retryable = err instanceof HttpError ? err.retryable : true;
      if (!retryable || attempt === cfg.maxAttempts - 1) break;
      const backoff = Math.min(
        cfg.backoffBaseMs * 2 ** attempt,
        cfg.backoffCapMs,
      );
      const wait =
        err instanceof HttpError && err.retryAfterMs != null
          ? Math.max(err.retryAfterMs, backoff)
          : backoff;
      console.warn(
        `x402scan: page ${req.page} (${sliceLabel(sorting)}) failed — ${(err as Error).message}; retrying in ${wait}ms`,
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
  skippedPages: number;
  endpoints: Endpoint[];
  seen: Set<string>;
  /** Row identities (URL + method), for keyset progress detection. */
  seenRows: Set<string>;
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

  // Keyset state. `cursor` is the lastUpdated of the last row we accepted;
  // `tiePage` walks offsets *within* one timestamp when more rows share it
  // than fit in a page, which is the only case a cursor cannot advance past.
  let cursor: string | null = null;
  let tiePage = 0;

  for (let page = 0; ; page++) {
    // In keyset mode every request is page 0 of a filtered set, so `skip`
    // stays at 0 (or at a small tie offset) no matter how deep we are.
    const req: PageRequest =
      cfg.keyset && cursor
        ? { page: tiePage, where: { lastUpdated: { lte: cursor } } }
        : { page: cfg.keyset ? 0 : page };

    let res: Paginated;
    try {
      res = await fetchPage(cfg, req, sorting);
    } catch (err) {
      const message = `${label} page ${page} (skip ${req.page * cfg.pageSize}${cursor ? `, cursor ${cursor}` : ""}): ${(err as Error).message}`;
      // A page-0 failure on the primary slice is a true failure — the caller
      // needs to see it. Anything deeper must not discard what we already
      // collected (a single deep-page 500 once collapsed the catalog to ~84).
      if (isFirstSlice && page === 0 && union.endpoints.length === 0) throw err;
      union.errors.push(message);

      // One broken page is a hole in the list, not its end. Step over it and
      // carry on: abandoning the crawl here is what turned a handful of 500s
      // into a catalog of 4,105 against an upstream total of 133,429.
      if (union.skippedPages < MAX_SKIPPED_PAGES) {
        union.skippedPages++;
        console.warn(
          `x402scan: skipping a broken page on ${label} (${union.skippedPages}/${MAX_SKIPPED_PAGES}) — ${message}`,
        );
        if (cfg.keyset && cursor) {
          // Step the cursor just past the failing window. Rows sharing that
          // exact millisecond are lost; the rest of the list is not.
          const t = Date.parse(cursor);
          if (Number.isFinite(t)) {
            cursor = new Date(t - 1).toISOString();
            tiePage = 0;
            await sleep(cfg.gapMs);
            continue;
          }
        } else if (!cfg.keyset) {
          await sleep(cfg.gapMs);
          continue; // the loop's own page++ steps over it
        }
      }

      console.warn(`x402scan: stopping ${label} — ${message}`);
      reason = "page_error";
      break;
    }
    pages++;
    union.pages++;

    const items = res.items ?? [];
    // `total_count` counts the rows matching `where`, so once we are paging by
    // a cursor it is the REMAINING count, not the directory's size. Only the
    // unfiltered request can tell us the total.
    if (typeof res.total_count === "number" && !req.where) {
      union.apiTotal = res.total_count;
    }

    if (items.length === 0) {
      // Empty while the previous page promised more = the API stopped serving
      // depth, not the end of the list.
      reason = expectingMore ? "page_ceiling" : "exhausted";
      break;
    }

    rows += items.length;
    union.rows += items.length;

    let freshRows = 0;
    for (const item of items) {
      if (!union.seenRows.has(rowKey(item))) {
        union.seenRows.add(rowKey(item));
        freshRows++;
      }
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

    if (cfg.keyset) {
      const last = items[items.length - 1];
      const nextCursor = str(last?.lastUpdated);
      if (!nextCursor) {
        // No cursor field to page by — fall back to offset for the rest.
        console.warn(
          `x402scan: ${label} has no lastUpdated to page by; falling back to offset paging.`,
        );
        cfg = { ...cfg, keyset: false };
      } else if (freshRows === 0) {
        // Every row on this page was already seen: more rows share this exact
        // timestamp than fit in a page. Step the offset within that tie only.
        tiePage++;
      } else {
        cursor = nextCursor;
        tiePage = 0;
      }
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
    skippedPages: 0,
    endpoints: [],
    seen: new Set(),
    seenRows: new Set(),
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
  //
  // The safety limit is the exception: that budget is ours and is already
  // spent, so more passes would only burn requests against the same ceiling.
  const shortfall =
    union.apiTotal != null && union.rows < union.apiTotal - cfg.pageSize;
  // Only a depth ceiling is worth re-reading in another sort order. On a
  // page_error the server is refusing requests — on 2026-10-03 all three
  // fallback slices died on their own first page, adding nothing but load to
  // an endpoint that was already failing. The safety limit is our own budget
  // and is already spent.
  const needsSlices =
    primary.stopped_reason === "page_ceiling" ||
    (primary.stopped_reason === "exhausted" && shortfall);

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
    skipped_pages: union.skippedPages,
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
