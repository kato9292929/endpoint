// Lightweight test runner (tsx + node:assert, no test framework dep).
// Run with: npm test
import assert from "node:assert/strict";
import { mergeEndpoints } from "../util";
import { defaultOrder, isFeatured } from "../../src/lib/featured";
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

console.log(`\n${passed} passed`);
