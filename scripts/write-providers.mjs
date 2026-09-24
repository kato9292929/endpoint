#!/usr/bin/env node
// Writes data/providers.json — the named providers the site shows above the
// ranking.
//
//   node scripts/write-providers.mjs [catalog path]
//
// Derived from the FULL catalog on purpose. data/endpoints.json is capped at
// 20,000 of ~105,000, and the recognizable providers are scattered across the
// whole list: computing this from the bundled subset found 4 companies where
// the full catalog has 9. The artifact itself is a few KB, so the site can
// import it without touching the page payload.
//
// Two groups, and the distinction is the whole point:
//
//   firstParty  — a company a reader recognizes, serving from its OWN domain.
//   selfHosted  — a Solana Foundation pay-skills provider serving from its own
//                 domain rather than through a gateway operator.
//
// Anything published through a gateway (PaySponge, Locus, x402 Atlas, …) is
// excluded from both: those endpoints belong to the gateway, not the company
// on the label.
//
// Dependency-free Node ESM.

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readCatalog } from "./read-catalog.mjs";
import { firstPartyBrand, gatewayOf, hostOf, HOSTING } from "./brands.mjs";

const ROOT = process.cwd();
const OUT = join(ROOT, "data", "providers.json");

const INPUT =
  process.argv[2] ??
  [
    join(ROOT, "data", "endpoints_full.json.gz"),
    join(ROOT, "data", "endpoints_full.json"),
    join(ROOT, "data", "endpoints.json"),
  ].find((p) => existsSync(p));

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Upstream titles arrive HTML-escaped ("Podcasts &amp; Newsletters"); the site
// renders them as text, so decode here rather than in every consumer.
function decode(s) {
  return String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function topKey(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

// The most common `name` on a host — the service, rather than one route's label.
function commonName(names) {
  return topKey(names) ?? "";
}

export function buildProviders(catalog, sourceLabel = "") {
  const byHost = new Map();

  for (const e of catalog.endpoints) {
    const host = hostOf(e.url);
    if (!host) continue;
    let agg = byHost.get(host);
    if (!agg) {
      agg = {
        host,
        count: 0,
        priced: 0,
        prices: [],
        categories: {},
        names: {},
        sources: new Set(),
        sampleId: e.id,
        sampleUrl: e.url,
        networks: new Set(),
      };
      byHost.set(host, agg);
    }
    agg.count++;
    if (e.price) {
      agg.priced++;
      agg.prices.push(e.price.amount);
    }
    agg.categories[e.category] = (agg.categories[e.category] ?? 0) + 1;
    if (e.name) agg.names[e.name] = (agg.names[e.name] ?? 0) + 1;
    for (const s of e.source ?? []) agg.sources.add(s);
    for (const n of e.networks ?? []) agg.networks.add(n);
  }

  const shape = (agg, extra) => ({
    host: agg.host,
    name: decode(commonName(agg.names)),
    count: agg.count,
    priced: agg.priced,
    priceMedian: median(agg.prices),
    topCategory: topKey(agg.categories),
    networks: [...agg.networks].sort(),
    sources: [...agg.sources].sort(),
    sampleId: agg.sampleId,
    url: agg.sampleUrl,
    ...extra,
  });

  const firstParty = [];
  const selfHosted = [];

  for (const agg of byHost.values()) {
    const brand = firstPartyBrand(agg.host);
    if (brand) {
      firstParty.push(shape(agg, { brand }));
      continue;
    }
    // pay-skills providers that serve from their own domain. Gateways and
    // shared hosting are not "their own domain".
    if (
      agg.sources.has("pay-sh") &&
      !gatewayOf(agg.host) &&
      !HOSTING.test(agg.host)
    ) {
      selfHosted.push(shape(agg, { brand: null }));
    }
  }

  firstParty.sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));
  selfHosted.sort((a, b) => b.count - a.count || a.host.localeCompare(b.host));

  return {
    generated_at: new Date().toISOString(),
    status: "ok",
    source: sourceLabel,
    // How many endpoints these counts were derived from. When the only
    // catalog available was the capped page file, `subset` says so — the
    // counts then understate and the site can label them.
    scanned: catalog.count ?? catalog.endpoints.length,
    subset: Boolean(catalog.subset_of),
    firstParty,
    selfHosted,
  };
}

function main() {
  if (!INPUT) {
    // No catalog at all — write an explicit "unavailable" rather than an empty
    // list that would read as "no named providers exist".
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          status: "unavailable",
          source: "",
          scanned: 0,
          firstParty: [],
          selfHosted: [],
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.warn("providers: no catalog found — wrote status: unavailable");
    return;
  }

  const catalog = readCatalog(INPUT);
  if (catalog.subset_of) {
    console.warn(
      `providers: WARNING — ${INPUT} is a subset (${catalog.count} of ${catalog.full_count}); ` +
        "counts will understate. Run `npm run fetch` to produce the full catalog.",
    );
  }

  const artifact = buildProviders(catalog, INPUT.replace(`${ROOT}/`, ""));
  writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.log(
    `providers: ${artifact.firstParty.length} first-party host(s), ` +
      `${artifact.selfHosted.length} self-hosted pay-skills provider(s), ` +
      `from ${artifact.scanned} endpoint(s) in ${artifact.source}`,
  );
}

main();
