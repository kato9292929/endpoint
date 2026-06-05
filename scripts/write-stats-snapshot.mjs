#!/usr/bin/env node
// Writes a daily stats snapshot from the aggregator output.
//
// Reads data/endpoints.json and writes data/stats/YYYY-MM-DD.json (UTC date),
// one file per day. Re-running the same day overwrites it (latest value wins).
//
// Dependency-free Node ESM — no tsx/ts-node. The cron runs:
//   node scripts/write-stats-snapshot.mjs
//
// The catalog's endpoint shape uses `category`, `networks[]`, `source[]`, and
// `price.amount`; we also absorb common aliases (chain/network, provider,
// priceUsd, numeric price) so the writer survives schema drift.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INPUT = join(ROOT, "data", "endpoints.json");
const OUT_DIR = join(ROOT, "data", "stats");

// ── Price-tier buckets (USD). Edit these edges to retune; order matters. ──
// Each endpoint's price falls into the first bucket whose `max` it is under
// (exclusive), with `free` and `unknown` handled specially.
const PRICE_TIERS = [
  { key: "free", max: 0 }, // exactly 0
  { key: "<$0.01", max: 0.01 },
  { key: "$0.01–0.05", max: 0.05 },
  { key: "$0.05–0.15", max: 0.15 },
  { key: ">$0.15", max: Infinity },
];

function asArray(...vals) {
  const out = [];
  for (const v of vals) {
    if (Array.isArray(v)) out.push(...v.filter(Boolean));
    else if (typeof v === "string" && v.trim()) out.push(v.trim());
  }
  return out;
}

function chainsOf(e) {
  return asArray(e.networks, e.chains, e.network, e.chain);
}

function sourcesOf(e) {
  return asArray(e.source, e.sources, e.provider);
}

function priceOf(e) {
  // Object form { amount } | numeric priceUsd | numeric price
  if (e.price && typeof e.price === "object" && typeof e.price.amount === "number")
    return e.price.amount;
  if (typeof e.priceUsd === "number") return e.priceUsd;
  if (typeof e.price === "number") return e.price;
  return undefined;
}

function priceTier(amount) {
  if (amount === undefined || Number.isNaN(amount)) return "unknown";
  if (amount === 0) return "free";
  for (const t of PRICE_TIERS) {
    if (t.key === "free") continue;
    if (amount < t.max) return t.key;
  }
  return ">$0.15";
}

function tally(into, key) {
  if (!key) return;
  into[key] = (into[key] ?? 0) + 1;
}

function main() {
  const catalog = JSON.parse(readFileSync(INPUT, "utf8"));
  const endpoints = Array.isArray(catalog.endpoints) ? catalog.endpoints : [];

  const byCategory = {};
  const byChain = {};
  const bySource = {};
  const byPriceTier = {};

  for (const e of endpoints) {
    tally(byCategory, e.category ?? e.cat ?? "unknown");
    for (const c of chainsOf(e)) tally(byChain, c);
    for (const s of sourcesOf(e)) tally(bySource, s);
    tally(byPriceTier, priceTier(priceOf(e)));
  }

  const date = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const snapshot = {
    date,
    generatedAt: catalog.generated_at ?? catalog.generatedAt ?? new Date().toISOString(),
    total: typeof catalog.count === "number" ? catalog.count : endpoints.length,
    byCategory,
    byChain,
    bySource,
    byPriceTier,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${date}.json`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  console.log(`Wrote ${file} (total: ${snapshot.total})`);
}

main();
