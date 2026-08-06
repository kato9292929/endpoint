// Lightweight test runner (tsx + node:assert, no test framework dep).
// Run with: npm test
import assert from "node:assert/strict";
import { mergeEndpoints } from "../util";
import { defaultOrder, isFeatured } from "../../src/lib/featured";
import { aggregateHosts, hostOf } from "../../src/lib/hosts";
import { rankFrom } from "../../src/lib/rank";
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
    ep({ id: "1", url: "https://a.example/x", category: "data", price: { amount: 0.01, currency: "USDC", unit: "per-call" } }),
    ep({ id: "2", url: "https://a.example/y", category: "data", price: { amount: 0.03, currency: "USDC", unit: "per-call" } }),
    ep({ id: "3", url: "https://a.example/z", category: "search" }),
    ep({ id: "4", url: "https://b.example/w", category: "data" }),
  ];
  const hosts = aggregateHosts(eps);
  assert.equal(hosts[0].host, "a.example");
  assert.equal(hosts[0].count, 3);
  assert.equal(hosts[0].topCategory, "data");
  assert.equal(hosts[0].priceMedian, 0.02); // median of [0.01, 0.03]
  assert.equal(hosts[1].host, "b.example");
  assert.equal(hostOf("https://www.c.example/p"), "c.example");
});

test("rankFrom is UNAVAILABLE when no endpoint has popularity (no fake order)", () => {
  const r = rankFrom([ep({ id: "1" }), ep({ id: "2" })]);
  assert.equal(r.status, "unavailable");
  assert.equal(r.rows.length, 0);
});

test("rankFrom re-lists by popularity as-is with its metric", () => {
  const r = rankFrom([
    ep({ id: "lo", name: "Lo", popularity: 5, popularity_metric: "x402scan:toolCalls" }),
    ep({ id: "hi", name: "Hi", url: "https://h.example/a", popularity: 900, popularity_metric: "x402scan:toolCalls" }),
  ]);
  assert.equal(r.status, "ok");
  assert.equal(r.metric, "x402scan:toolCalls");
  assert.equal(r.rows[0].id, "hi");
  assert.equal(r.rows[0].rank, 1);
  assert.equal(r.rows[0].host, "h.example");
});

console.log(`\n${passed} passed`);
