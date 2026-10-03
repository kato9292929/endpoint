#!/usr/bin/env node
// Reports which recognizable companies appear in a catalog — and separates the
// ones serving from their own domain from the ones whose name is merely
// borrowed. See scripts/brands.mjs for the rule and why it matters.
//
//   node scripts/find-brands.mjs [catalog path]
//
// Dependency-free Node ESM. Appends to $GITHUB_STEP_SUMMARY in Actions.

import { appendFileSync, existsSync } from "node:fs";
import { readCatalog } from "./read-catalog.mjs";
import { borrowedBrand, firstPartyBrand, gatewayOf, hostOf } from "./brands.mjs";

const path =
  process.argv[2] ??
  ["data/endpoints_full.json.gz", "data/endpoints_full.json", "data/endpoints.json"].find(
    (p) => existsSync(p),
  );
if (!path) {
  console.error("no catalog found");
  process.exit(2);
}

const catalog = readCatalog(path);

const firstParty = new Map(); // brand → Map(host → {count, priced, sources})
const lookalike = new Map(); // brand → Map(host → count)

for (const e of catalog.endpoints) {
  const host = hostOf(e.url);
  if (!host) continue;
  const brand = firstPartyBrand(host);
  if (brand) {
    if (!firstParty.has(brand)) firstParty.set(brand, new Map());
    const hosts = firstParty.get(brand);
    const row = hosts.get(host) ?? { count: 0, priced: 0, sources: new Set() };
    row.count++;
    if (e.price) row.priced++;
    for (const s of e.source ?? []) row.sources.add(s);
    hosts.set(host, row);
    continue;
  }
  const borrowed = borrowedBrand(host);
  if (borrowed) {
    if (!lookalike.has(borrowed)) lookalike.set(borrowed, new Map());
    const hosts = lookalike.get(borrowed);
    hosts.set(host, (hosts.get(host) ?? 0) + 1);
  }
}

const out = [];
const say = (l = "") => {
  out.push(l);
  console.log(l);
};

say(`## Recognizable companies in ${path}`);
say();
say(`${catalog.count} endpoints scanned.`);
say();

say("### First-party — host is under the company's own domain");
say();
if (firstParty.size === 0) {
  say("_none_");
} else {
  say("| brand | host | endpoints | with a price | source |");
  say("| --- | --- | --- | --- | --- |");
  const rows = [];
  for (const [brand, hosts] of firstParty) {
    for (const [host, r] of hosts) {
      rows.push({ brand, host, ...r });
    }
  }
  rows.sort((a, b) => b.count - a.count);
  for (const r of rows) {
    say(
      `| ${r.brand} | ${r.host} | ${r.count} | ${r.priced} | ${[...r.sources].join(", ")} |`,
    );
  }
}
say();

say("### Name borrowed — NOT the company's own domain, do not cite as theirs");
say();
if (lookalike.size === 0) {
  say("_none_");
} else {
  say("| borrows | host | via | endpoints |");
  say("| --- | --- | --- | --- |");
  const rows = [];
  for (const [brand, hosts] of lookalike) {
    for (const [host, count] of hosts) rows.push({ brand, host, count });
  }
  rows.sort((a, b) => b.count - a.count);
  for (const r of rows.slice(0, 40)) {
    say(`| ${r.brand} | ${r.host} | ${gatewayOf(r.host) ?? "—"} | ${r.count} |`);
  }
  if (rows.length > 40) say(`| … | _${rows.length - 40} more_ | | |`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
}
