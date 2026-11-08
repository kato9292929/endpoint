// data/services.json — the catalog grouped into SERVICES rather than routes.
//
// The site's top has been leading with the raw endpoint total (197,234 and
// climbing). That number is true and it is also the least useful thing on the
// page: sorted by endpoint count the list fills with trycloudflare.com tunnels
// and vercel.app deployments. "Everything is in here" is not the same claim as
// "here is what is actually worth calling".
//
// So this groups the catalog by the thing a reader recognises — a company, or
// an independent service on its own domain — and only keeps the ones with a
// stated reason to be there. The endpoint total stays as the denominator that
// makes the selection mean something.
//
// Two parties, the distinction the catalog has carried since September:
//
//   1P  the service's own domain. Running it is the company's own doing.
//   3P  a known company's API resold through a payment gateway. Useful, and
//       NOT the company's own listing — never present it as theirs.
//
// Usage: node scripts/write-services.mjs [catalog]

import { writeFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readCatalog, firstExisting } from "./read-catalog.mjs";
import {
  firstPartyBrand,
  borrowedBrand,
  gatewayOf,
  hostOf,
  HOSTING,
} from "./brands.mjs";

const ROOT = process.cwd();
const OUT = join(ROOT, "data", "services.json");
const LOGO_DIR = join(ROOT, "public", "logos");

// Endpoint count is deliberately NOT a reason to be listed. It was, and it
// let in 625 of 716 entries: lhr.life with 46,444 endpoints, pinggy tunnels
// whose names read "Caution - you are about to visit", sslip.io wildcard DNS.
// Anyone can deploy ten thousand routes on a domain they bought this morning,
// so volume is evidence of effort, never of acceptance. The three reasons
// below are the ones a reader would accept as "the market knows this":
//
//   brand    a company recognisable by name, on its own domain or via a gateway
//   pay-sh   listed in the pay.sh directory — curated by someone other than us
//   ranked   actually called, per x402scan's daily most-called ranking
const QUALIFYING = ["brand", "pay-sh", "ranked"];

// Suffixes where the registrable name is the third label from the right.
// Short list on purpose: this only has to be right for hosts we publish.
const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "ac.uk", "co.jp", "or.jp", "ne.jp", "ac.jp",
  "com.br", "com.au", "com.cn", "co.kr", "co.in", "com.mx", "co.za",
]);

/** The domain a service is identified by — api.x.com and x402.x.com are one. */
export function registrable(host) {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  return MULTI_PART_TLDS.has(lastTwo)
    ? parts.slice(-3).join(".")
    : lastTwo;
}

export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * A service's name, out of a catalog field that is really a page title.
 *
 * Upstream listings put the whole pitch in `name`: "Agent402: 500+ pay-per-call
 * tools for AI agents over x402", "K-2SO · Autonomous x402 Agent Merchant on
 * Base". A row needs the subject, so cut at the first separator that starts a
 * description and stop there. Returns "" when nothing usable is left, and the
 * caller falls back to the domain — which reads fine for the twit.sh sort of
 * name that never had a prose form.
 */
export function cleanName(raw) {
  if (!raw) return "";
  const decoded = raw
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#8217;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Separators that introduce a tagline. The hyphen and colon need the space
  // so "K-2SO", "Pay-per-call" and "x402:stock" survive intact.
  const cut = decoded.split(
    /\s+[|·•‧]\s+|\s+[—–]\s+|\s+-\s+|:\s+|\?\s+|,\s+/,
  )[0].trim();

  const name = (cut || decoded).replace(/[\s.,;:·—–-]+$/, "");
  // Still a sentence? Then the field never held a name; let the domain speak.
  if (name.length > 32 || name.split(" ").length > 5) return "";
  return name;
}

function topKey(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function logoFor(slug) {
  if (!existsSync(LOGO_DIR)) return null;
  for (const f of readdirSync(LOGO_DIR)) {
    if (f.replace(/\.[a-z0-9]+$/i, "") === slug) return `/logos/${f}`;
  }
  return null;
}

export function buildServices(catalog, opts = {}) {
  const ranked = new Set(opts.rankedHosts ?? []);

  // One bucket per service. 1P and independents key on their domain; 3P keys
  // on the brand, because the same company shows up behind several gateways.
  const buckets = new Map();

  const bucket = (key, init) => {
    let b = buckets.get(key);
    if (!b) {
      b = {
        key,
        party: init.party,
        brand: init.brand ?? null,
        domain: init.domain ?? null,
        endpoints: 0,
        priced: 0,
        prices: [],
        categories: {},
        names: {},
        hosts: new Map(),
        networks: new Set(),
        sources: new Set(),
        gateways: new Set(),
        sampleUrl: null,
      };
      buckets.set(key, b);
    }
    return b;
  };

  for (const e of catalog.endpoints) {
    const host = hostOf(e.url);
    if (!host) continue;

    const brand1p = firstPartyBrand(host);
    const gw = gatewayOf(host);
    let b;
    if (brand1p) {
      b = bucket(`1p:${brand1p}`, { party: "1P", brand: brand1p, domain: registrable(host) });
    } else {
      // A provider's name inside a HOSTING domain is its infrastructure, not
      // its API: x.trycloudflare.com is a tunnel to someone's laptop, and
      // counting it as Cloudflare put 311 endpoints on Cloudflare's row when
      // only the 14 behind payweave.services were ever Cloudflare's.
      const brand3p = HOSTING.test(host) ? null : borrowedBrand(host);
      if (brand3p) {
        b = bucket(`3p:${brand3p}`, { party: "3P", brand: brand3p });
      } else if (!HOSTING.test(host) && !gw) {
        b = bucket(`own:${registrable(host)}`, { party: "1P", domain: registrable(host) });
      } else {
        // Shared hosting or a gateway's own listing with no company named.
        continue;
      }
    }

    b.endpoints++;
    if (e.price) {
      b.priced++;
      b.prices.push(e.price.amount);
    }
    b.categories[e.category] = (b.categories[e.category] ?? 0) + 1;
    if (e.name) b.names[e.name] = (b.names[e.name] ?? 0) + 1;
    b.hosts.set(host, (b.hosts.get(host) ?? 0) + 1);
    for (const n of e.networks ?? []) b.networks.add(n);
    for (const s of e.source ?? []) b.sources.add(s);
    if (gw) b.gateways.add(gw);
    if (!b.sampleUrl) b.sampleUrl = e.url;
  }

  const services = [];
  for (const b of buckets.values()) {
    // Why this one is here. A service with no reason is left out — that
    // refusal is the whole point of the page.
    const reasons = [];
    if (b.brand) reasons.push("brand");
    if (b.sources.has("pay-sh")) reasons.push("pay-sh");
    if ([...b.hosts.keys()].some((h) => ranked.has(h))) reasons.push("ranked");
    if (reasons.length === 0) continue;

    const name = b.brand || cleanName(topKey(b.names)) || b.domain;
    const hosts = [...b.hosts.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([h]) => h);
    const slug = slugify(b.party === "3P" ? `${name}-via` : name || b.domain);

    services.push({
      slug,
      name: name || b.domain,
      party: b.party,
      domain: b.domain,
      category: topKey(b.categories),
      endpoints: b.endpoints,
      priced: b.priced,
      priceMin: b.prices.length ? Math.min(...b.prices) : null,
      priceMedian: median(b.prices),
      networks: [...b.networks].sort(),
      hosts: hosts.slice(0, 8),
      hostCount: b.hosts.size,
      via: b.party === "3P" ? [...b.gateways].sort() : [],
      reasons,
      logo: logoFor(slug),
      url: b.sampleUrl,
    });
  }

  // Known companies first, then by how much they actually serve.
  services.sort(
    (a, b) =>
      Number(b.reasons.includes("brand")) - Number(a.reasons.includes("brand")) ||
      b.endpoints - a.endpoints ||
      a.name.localeCompare(b.name),
  );

  return {
    generated_at: new Date().toISOString(),
    status: "ok",
    // The denominator. The selection below only means something next to it.
    scanned: catalog.count ?? catalog.endpoints.length,
    subset: Boolean(catalog.subset_of),
    qualifying_reasons: QUALIFYING,
    counts: {
      services: services.length,
      endpoints: services.reduce((s, x) => s + x.endpoints, 0),
      first_party: services.filter((s) => s.party === "1P").length,
      third_party: services.filter((s) => s.party === "3P").length,
      with_logo: services.filter((s) => s.logo).length,
    },
    services,
  };
}

/**
 * Every host x402scan has ever ranked in a daily top 50 that we recorded.
 *
 * Today's ranking alone is 50 rows, so a service that was busy last month but
 * quiet this morning would read as unknown. Each stats snapshot kept its own
 * `rankTop50`, so the union across them is "has demonstrably been called" —
 * which is the claim, rather than "is being called right now".
 */
function rankedHosts() {
  const hosts = new Set();

  const rank = join(ROOT, "data", "rank.json");
  if (existsSync(rank)) {
    try {
      for (const r of JSON.parse(readFileSync(rank, "utf8")).rows ?? []) {
        if (r.host) hosts.add(r.host);
      }
    } catch {
      // a corrupt ranking just contributes nothing
    }
  }

  const statsDir = join(ROOT, "data", "stats");
  if (existsSync(statsDir)) {
    for (const f of readdirSync(statsDir)) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
      try {
        const snap = JSON.parse(readFileSync(join(statsDir, f), "utf8"));
        for (const r of snap.rankTop50 ?? []) if (r.host) hosts.add(r.host);
      } catch {
        // skip an unreadable snapshot
      }
    }
  }
  return [...hosts];
}

async function main() {
  const explicit = process.argv.slice(2).find((a) => !a.startsWith("--"));

  const input =
    explicit ??
    firstExisting(
      join(ROOT, "data", "endpoints_full.json.gz"),
      join(ROOT, "data", "endpoints_full.json"),
      join(ROOT, "data", "endpoints.json"),
    );
  if (!input) throw new Error("no catalog found");

  const catalog = await readCatalog(input);

  // A degraded catalog is an incomplete census, and a page that says "these
  // are the services worth knowing" must not be rebuilt from one.
  if (catalog.degraded) {
    console.warn(
      `::warning::services: NOT rebuilding — the catalog is degraded ` +
        `(${catalog.degraded.reason}). Keeping the previous data/services.json.`,
    );
    return;
  }

  const ranked = rankedHosts();
  const out = buildServices(catalog, { rankedHosts: ranked });
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  const c = out.counts;
  console.log(
    `services: ${c.services} (${c.first_party} first-party, ${c.third_party} third-party) ` +
      `covering ${c.endpoints.toLocaleString()} of ${out.scanned.toLocaleString()} endpoints; ` +
      `${c.with_logo} have a logo (${ranked.length} hosts ever ranked)`,
  );
}

// Not `await main()`: the test runner compiles this module to CJS, where a
// top-level await is a syntax error, and these rules are worth testing.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
