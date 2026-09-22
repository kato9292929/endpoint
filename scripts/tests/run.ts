// Lightweight test runner (tsx + node:assert, no test framework dep).
// Run with: npm test
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mergeEndpoints } from "../util";
import { fetchX402scan, getLastX402scanRun } from "../fetchers/x402scan";
import { pageSubset } from "../page-subset";
import { defaultOrder, isFeatured } from "../../src/lib/featured";
import { aggregateHosts, hostOf } from "../../src/lib/hosts";
import { buildRankRows, type RankArtifact } from "../../src/lib/rank";
import type { Endpoint } from "../../src/lib/types";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

function ep(over: Partial<Endpoint>): Endpoint {
  return {
    id: over.id ?? "id",
    url: over.url ?? "https://x.example/a",
    name: over.name ?? "A",
    description: over.description ?? "",
    category: over.category ?? "other",
    networks: over.networks ?? [],
    protocols: over.protocols ?? ["x402"],
    source: over.source ?? ["x402scan"],
    source_url: over.source_url ?? "",
    last_seen: over.last_seen ?? "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

console.log("Stage 1 — types / merge / ordering");

test("mergeEndpoints unions sources and carries the winning popularity metric", () => {
  const a = ep({
    source: ["x402-inc"],
    popularity: 10,
    popularity_metric: "seed",
    last_seen: "2026-01-01T00:00:00.000Z",
  });
  const b = ep({
    source: ["x402scan"],
    popularity: 999,
    popularity_metric: "x402scan:toolCalls",
    last_seen: "2026-02-01T00:00:00.000Z",
  });
  const m = mergeEndpoints(a, b);
  assert.deepEqual(m.source.sort(), ["x402-inc", "x402scan"]);
  assert.equal(m.popularity, 999);
  assert.equal(m.popularity_metric, "x402scan:toolCalls");
});

test("mergeEndpoints carries health/verification when only one side has them", () => {
  const a = ep({ last_seen: "2026-02-01T00:00:00.000Z" });
  const b = ep({
    last_seen: "2026-01-01T00:00:00.000Z",
    health: { status: "healthy", uptime_30d: 0.99 },
    verification: { domain_verified: true },
  });
  const m = mergeEndpoints(a, b);
  assert.equal(m.health?.status, "healthy");
  assert.equal(m.verification?.domain_verified, true);
});

test("mergeEndpoints leaves popularity_metric undefined when no popularity", () => {
  const m = mergeEndpoints(ep({}), ep({ source: ["pay-sh"] }));
  assert.equal(m.popularity, undefined);
  assert.equal(m.popularity_metric, undefined);
});

test("defaultOrder does NOT pin featured (x402-inc) — pure popularity/name", () => {
  const featured = ep({ id: "inc", name: "ZZ Inc", source: ["x402-inc"], popularity: 1 });
  const strong = ep({ id: "top", name: "Aardvark", source: ["x402scan"], popularity: 500 });
  const none = ep({ id: "n", name: "Middle", source: ["x402scan"] });
  const ordered = defaultOrder([featured, none, strong]);
  assert.equal(ordered[0].id, "top", "highest popularity leads, not the featured one");
  assert.equal(isFeatured(featured), true);
  assert.notEqual(ordered[0].id, "inc", "featured must not be pinned first");
});

console.log("\nStage 3 — hosts / rank");

test("aggregateHosts groups routes by host, sorts by count desc", () => {
  const eps = [
    ep({ id: "1", name: "Svc A", url: "https://a.example/x", category: "data", price: { amount: 0.01, currency: "USDC", unit: "per-call" } }),
    ep({ id: "2", name: "Svc A", url: "https://a.example/y", category: "data", price: { amount: 0.03, currency: "USDC", unit: "per-call" } }),
    ep({ id: "3", name: "Svc A", url: "https://a.example/z", category: "search" }),
    ep({ id: "4", name: "Svc B", url: "https://b.example/w", category: "data" }),
  ];
  const hosts = aggregateHosts(eps);
  assert.equal(hosts[0].host, "a.example");
  assert.equal(hosts[0].serviceName, "Svc A"); // mode of names on the host
  assert.equal(hosts[0].count, 3);
  assert.equal(hosts[0].share, 3 / 4); // 3 of 4 total routes
  assert.equal(hosts[0].topCategory, "data");
  assert.equal(hosts[0].priceMedian, 0.02); // median of [0.01, 0.03]
  assert.equal(hosts[1].host, "b.example");
  assert.equal(hostOf("https://www.c.example/p"), "c.example");
});

const UNAVAIL: RankArtifact = {
  generated_at: "2026-08-05T00:00:00.000Z",
  status: "unavailable",
  metric: null,
  timeframe: 1,
  sorting: "tx_count",
  rows: [],
};

test("buildRankRows is UNAVAILABLE when the artifact is unavailable (no fake order)", () => {
  const r = buildRankRows(UNAVAIL, [ep({ id: "1" }), ep({ id: "2" })]);
  assert.equal(r.status, "unavailable");
  assert.equal(r.rows.length, 0);
});

test("buildRankRows re-lists artifact rows as-is and joins the catalog by host", () => {
  const artifact: RankArtifact = {
    ...UNAVAIL,
    status: "ok",
    metric: "x402scan:tx_count:1d",
    rows: [
      { rank: 1, origin: "https://h.example", title: "H Service", host: "h.example", tx_count: 900, total_amount: 12.5, unique_buyers: 40, popularity_metric: "x402scan:tx_count:1d" },
    ],
  };
  const eps = [
    ep({ id: "a", url: "https://h.example/one", category: "data", networks: ["Base"], price: { amount: 0.01, currency: "USDC", unit: "per-call" } }),
  ];
  const r = buildRankRows(artifact, eps);
  assert.equal(r.status, "ok");
  assert.equal(r.metric, "x402scan:tx_count:1d");
  assert.equal(r.rows[0].rank, 1);
  assert.equal(r.rows[0].tx_count, 900);
  assert.equal(r.rows[0].category, "data"); // joined from catalog
  assert.deepEqual(r.rows[0].networks, ["Base"]);
});

console.log("\nStage 3b — page subset");

test("pageSubset keeps every non-x402scan endpoint, even a stale featured one", () => {
  const seed = ep({
    id: "seed",
    url: "https://x402jp.com/a",
    name: "Seed",
    source: ["x402-inc"],
    last_seen: "2020-01-01T00:00:00.000Z", // oldest in the set
  });
  const scan = Array.from({ length: 5 }, (_, i) =>
    ep({
      id: `s${i}`,
      url: `https://s${i}.example/a`,
      name: `S${i}`,
      source: ["x402scan"],
      last_seen: `2026-09-${10 + i}T00:00:00.000Z`,
    }),
  );
  const picked = pageSubset([seed, ...scan], 3);
  assert.equal(picked.length, 3);
  assert.ok(
    picked.some((e) => e.id === "seed"),
    "the featured seed survives the cap despite being the oldest",
  );
  // The two freshest x402scan rows fill the remaining room.
  assert.deepEqual(
    picked
      .filter((e) => e.id !== "seed")
      .map((e) => e.id)
      .sort(),
    ["s3", "s4"],
  );
});

test("pageSubset keeps a URL that several directories list", () => {
  const shared = ep({
    id: "shared",
    url: "https://both.example/a",
    name: "Both",
    source: ["x402scan", "pay-sh"], // merged across directories
    last_seen: "2020-01-01T00:00:00.000Z",
  });
  const scan = Array.from({ length: 3 }, (_, i) =>
    ep({
      id: `s${i}`,
      url: `https://s${i}.example/a`,
      name: `S${i}`,
      source: ["x402scan"],
      last_seen: `2026-09-${10 + i}T00:00:00.000Z`,
    }),
  );
  const picked = pageSubset([shared, ...scan], 2);
  assert.ok(picked.some((e) => e.id === "shared"));
});

test("pageSubset is a no-op under the cap", () => {
  const eps = [ep({ id: "a" }), ep({ id: "b" })];
  assert.equal(pageSubset(eps, 10).length, 2);
});

// ── Stage 4 — x402scan paging ────────────────────────
// The fetcher is exercised against a local fake that reproduces x402scan's
// server semantics exactly (verified against Merit-Systems/x402scan):
//   skip: page * page_size, take: page_size + 1
//   → { items, hasNextPage, total_count, total_pages, page }
// wrapped in the non-batched superjson envelope { result: { data: { json } } }.

type FakeSorting = { id: string; desc: boolean };
type FakeRow = { resource: string };

type FakeOptions = {
  // Rows the fake holds, in the order the given sorting would return them.
  rowsFor: (sorting: FakeSorting) => FakeRow[];
  // Rows past this offset come back empty while hasNextPage stays true —
  // i.e. an API-side depth ceiling.
  depthLimit?: (sorting: FakeSorting) => number;
  // Reply 429 (with Retry-After) to the first N requests.
  failFirst?: number;
  // total_count the fake advertises; defaults to the sorted row count.
  totalCount?: number;
};

type Fake = { url: string; requests: number; close: () => Promise<void> };

function startFake(opts: FakeOptions): Promise<Fake> {
  let requests = 0;
  const server: Server = createServer((req, res) => {
    requests++;
    const url = new URL(req.url ?? "/", "http://localhost");
    const input = JSON.parse(url.searchParams.get("input") ?? "{}").json ?? {};
    const sorting: FakeSorting = input.sorting ?? { id: "lastUpdated", desc: true };
    const { page = 0, page_size = 10 } = input.pagination ?? {};

    if (opts.failFirst && requests <= opts.failFirst) {
      res.writeHead(429, { "retry-after": "0" });
      res.end("rate limited");
      return;
    }

    const rows = opts.rowsFor(sorting);
    const limit = opts.depthLimit?.(sorting) ?? rows.length;
    const skip = page * page_size;
    // take page_size + 1 and peek, exactly like the upstream query.
    const window = rows.slice(skip, Math.min(skip + page_size + 1, limit));
    const total_count = opts.totalCount ?? rows.length;
    const payload = {
      items: window.slice(0, page_size),
      // hasNextPage is computed from the real total, so a depth ceiling shows
      // up as "empty page while more was promised" — the case we detect.
      hasNextPage: skip + page_size < total_count,
      total_count,
      total_pages: Math.ceil(total_count / page_size),
      page,
    };
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ result: { data: { json: payload } } }));
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}`,
        get requests() {
          return requests;
        },
        close: () =>
          new Promise<void>((done) => server.close(() => done())),
      } as Fake);
    });
  });
}

function rows(n: number, prefix = "https://e"): FakeRow[] {
  return Array.from({ length: n }, (_, i) => ({
    resource: `${prefix}${i}.example/api`,
  }));
}

// The fetcher reads its knobs from the environment on every run, so a
// scenario just sets them before calling it.
function configure(env: Record<string, string>) {
  for (const k of [
    "X402SCAN_BASE_URL",
    "X402SCAN_PAGE_SIZE",
    "X402SCAN_GAP_MS",
    "X402SCAN_SAFETY_MAX",
  ]) {
    delete process.env[k];
  }
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
}

async function asyncTest(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

async function stage4() {
  console.log("\nStage 4 — x402scan paging");

  await asyncTest(
    "pages past 20,000 rows — the old MAX_ENDPOINTS cap is gone",
    async () => {
      const all = rows(25_000);
      const fake = await startFake({ rowsFor: () => all });
      try {
        configure({
          X402SCAN_BASE_URL: fake.url,
          X402SCAN_PAGE_SIZE: "5000",
          X402SCAN_GAP_MS: "0",
          X402SCAN_SAFETY_MAX: "200000",
        });
        const eps = await fetchX402scan();
        const run = getLastX402scanRun()!;
        assert.equal(eps.length, 25_000);
        assert.equal(run.rows, 25_000);
        assert.equal(run.api_total, 25_000);
        assert.equal(run.pages, 5);
        assert.equal(run.truncated, false);
        assert.equal(run.sliced, false);
        assert.equal(run.stopped_reason, "exhausted");
      } finally {
        await fake.close();
      }
    },
  );

  await asyncTest(
    "rows repeating a URL (upstream keys by URL+method) collapse in unique_urls",
    async () => {
      const dup = [...rows(10), ...rows(10)]; // every URL served twice
      const fake = await startFake({ rowsFor: () => dup });
      try {
        configure({
          X402SCAN_BASE_URL: fake.url,
          X402SCAN_PAGE_SIZE: "20",
          X402SCAN_GAP_MS: "0",
        });
        const eps = await fetchX402scan();
        const run = getLastX402scanRun()!;
        assert.equal(run.rows, 20);
        assert.equal(run.unique_urls, 10);
        assert.equal(eps.length, 10);
      } finally {
        await fake.close();
      }
    },
  );

  await asyncTest(
    "a depth ceiling triggers the slice fallback and the union completes",
    async () => {
      const all = rows(1000);
      const reversed = [...all].reverse();
      const fake = await startFake({
        // desc serves the list head-first, asc serves it tail-first.
        rowsFor: (s) => (s.desc ? all : reversed),
        // Neither order serves past 600 rows deep, but together they cover
        // all 1000 — exactly the shape the fallback exists for.
        depthLimit: () => 600,
      });
      try {
        configure({
          X402SCAN_BASE_URL: fake.url,
          X402SCAN_PAGE_SIZE: "100",
          X402SCAN_GAP_MS: "0",
        });
        const eps = await fetchX402scan();
        const run = getLastX402scanRun()!;
        assert.equal(run.sliced, true);
        assert.equal(run.unique_urls, 1000); // full coverage via both orders
        assert.equal(eps.length, 1000);
        assert.ok(
          run.slices.length > 1,
          "every slice that ran is recorded in fetch_report",
        );
        assert.equal(run.slices[0].stopped_reason, "page_ceiling");
        // No single pass ever reached the end of the list, so coverage is not
        // provable even though the union happens to be complete here. The run
        // stays flagged rather than claiming a clean sweep.
        assert.equal(run.truncated, true);
      } finally {
        await fake.close();
      }
    },
  );

  await asyncTest(
    "the safety limit records truncated: true instead of stopping quietly",
    async () => {
      const all = rows(5000);
      const fake = await startFake({ rowsFor: () => all });
      try {
        configure({
          X402SCAN_BASE_URL: fake.url,
          X402SCAN_PAGE_SIZE: "100",
          X402SCAN_GAP_MS: "0",
          X402SCAN_SAFETY_MAX: "300",
        });
        await fetchX402scan();
        const run = getLastX402scanRun()!;
        assert.equal(run.truncated, true);
        assert.equal(run.stopped_reason, "safety_limit");
        assert.equal(run.api_total, 5000);
        // Our own budget is spent, so re-reading in other sort orders would
        // only burn requests against the same ceiling.
        assert.equal(run.sliced, false);
        assert.equal(run.pages, 3);
      } finally {
        await fake.close();
      }
    },
  );

  await asyncTest("429 with Retry-After is retried, not dropped", async () => {
    const all = rows(50);
    const fake = await startFake({ rowsFor: () => all, failFirst: 2 });
    try {
      configure({
        X402SCAN_BASE_URL: fake.url,
        X402SCAN_PAGE_SIZE: "50",
        X402SCAN_GAP_MS: "0",
      });
      const eps = await fetchX402scan();
      const run = getLastX402scanRun()!;
      assert.equal(eps.length, 50);
      assert.equal(run.truncated, false);
    } finally {
      await fake.close();
    }
  });
}

stage4()
  .then(() => {
    console.log(`\n${passed} passed`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
