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

  // Host aggregation (routes per host).
  const hostMap = new Map();
  const hostOf = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };
  const median = (xs) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  for (const e of endpoints) {
    tally(byCategory, e.category ?? e.cat ?? "unknown");
    for (const c of chainsOf(e)) tally(byChain, c);
    for (const s of sourcesOf(e)) tally(bySource, s);
    tally(byPriceTier, priceTier(priceOf(e)));

    const host = hostOf(e.url);
    let h = hostMap.get(host);
    if (!h) {
      h = { host, names: {}, count: 0, cats: {}, prices: [] };
      hostMap.set(host, h);
    }
    h.count++;
    h.names[e.name] = (h.names[e.name] ?? 0) + 1;
    h.cats[e.category] = (h.cats[e.category] ?? 0) + 1;
    const amt = priceOf(e);
    if (typeof amt === "number") h.prices.push(amt);
  }

  const byHost = [...hostMap.values()]
    .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host))
    .slice(0, 100)
    .map((h) => ({
      host: h.host,
      name: Object.entries(h.names).sort((a, b) => b[1] - a[1])[0]?.[0] ?? h.host,
      count: h.count,
      priceMedian: median(h.prices),
      topCategory:
        Object.entries(h.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }));

  // rankTop50 from data/rank.json (empty when the ranking is unavailable).
  let rankTop50 = [];
  try {
    const rank = JSON.parse(readFileSync(join(ROOT, "data", "rank.json"), "utf8"));
    if (rank.status === "ok" && Array.isArray(rank.rows)) {
      rankTop50 = rank.rows.slice(0, 50).map((r) => ({
        rank: r.rank,
        origin: r.origin,
        title: r.title,
        host: r.host,
        tx_count: r.tx_count,
        total_amount: r.total_amount,
        unique_buyers: r.unique_buyers,
        popularity_metric: r.popularity_metric,
      }));
    }
  } catch {
    // no rank artifact — leave rankTop50 empty
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
    hostCount: hostMap.size,
    byHost,
    rankTop50,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `${date}.json`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  console.log(`Wrote ${file} (total: ${snapshot.total})`);
}

main();
