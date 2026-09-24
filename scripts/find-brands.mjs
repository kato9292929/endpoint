#!/usr/bin/env node
// Finds recognizable companies in a catalog — and, just as importantly,
// separates them from endpoints that only borrow the name.
//
//   node scripts/find-brands.mjs [catalog path]
//
// Why the split matters: anyone can publish an x402 endpoint called
// "CoinGecko Price API" on their own domain. Listing that as a brand-name
// endpoint would be wrong. Only a host under the company's own registrable
// domain is evidence the company itself serves x402.
//
//   first-party   pro-api.coingecko.com          → coingecko.com   ✓
//   lookalike     coingecko-prices.example.com   → mentions it     ✗
//
// Dependency-free Node ESM. Appends to $GITHUB_STEP_SUMMARY in Actions.

import { appendFileSync, existsSync } from "node:fs";
import { readCatalog } from "./read-catalog.mjs";

// Registrable domains of companies a reader would recognize. Matching is on
// the domain, never on the word, so "x402nansen….vercel.app" cannot pass as
// Nansen. Add entries freely — a miss here only means a brand goes unreported.
const BRANDS = {
  "nansen.ai": "Nansen",
  "coingecko.com": "CoinGecko",
  "coinmarketcap.com": "CoinMarketCap",
  "dune.com": "Dune",
  "messari.io": "Messari",
  "glassnode.com": "Glassnode",
  "kaiko.com": "Kaiko",
  "chainalysis.com": "Chainalysis",
  "defillama.com": "DefiLlama",
  "llama.fi": "DefiLlama",
  "etherscan.io": "Etherscan",
  "alchemy.com": "Alchemy",
  "infura.io": "Infura",
  "quicknode.com": "QuickNode",
  "moralis.io": "Moralis",
  "thegraph.com": "The Graph",
  "covalenthq.com": "Covalent",
  "bitquery.io": "Bitquery",
  "chainlink.com": "Chainlink",
  "pyth.network": "Pyth",
  "0x.org": "0x",
  "1inch.io": "1inch",
  "uniswap.org": "Uniswap",
  "circle.com": "Circle",
  "coinbase.com": "Coinbase",
  "binance.com": "Binance",
  "kraken.com": "Kraken",
  "polymarket.com": "Polymarket",
  "openai.com": "OpenAI",
  "anthropic.com": "Anthropic",
  "perplexity.ai": "Perplexity",
  "exa.ai": "Exa",
  "tavily.com": "Tavily",
  "firecrawl.dev": "Firecrawl",
  "apify.com": "Apify",
  "serpapi.com": "SerpApi",
  "brave.com": "Brave",
  "elevenlabs.io": "ElevenLabs",
  "replicate.com": "Replicate",
  "huggingface.co": "Hugging Face",
  "fal.ai": "fal",
  "stability.ai": "Stability AI",
  "deepgram.com": "Deepgram",
  "assemblyai.com": "AssemblyAI",
  "runwayml.com": "Runway",
  "bloomberg.com": "Bloomberg",
  "reuters.com": "Reuters",
  "polygon.io": "Polygon.io",
  "alphavantage.co": "Alpha Vantage",
  "twelvedata.com": "Twelve Data",
  "finnhub.io": "Finnhub",
  "stripe.com": "Stripe",
  "plaid.com": "Plaid",
  "twilio.com": "Twilio",
  "sendgrid.com": "SendGrid",
  "resend.com": "Resend",
  "mapbox.com": "Mapbox",
  "openweathermap.org": "OpenWeather",
  "google.com": "Google",
  "googleapis.com": "Google",
  "amazonaws.com": "AWS",
  "cloudflare.com": "Cloudflare",
  "supabase.com": "Supabase",
};

// Hosting and PaaS domains. A host under these says nothing about who runs it,
// so they never count as first-party for anyone.
const HOSTING =
  /(^|\.)(vercel\.app|netlify\.app|onrender\.com|railway\.app|up\.railway\.app|fly\.dev|herokuapp\.com|workers\.dev|pages\.dev|pythonanywhere\.com|repl\.co|replit\.dev|ngrok\.io|glitch\.me|surge\.sh|firebaseapp\.com|web\.app|azurewebsites\.net|appspot\.com)$/i;

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

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** The brand whose registrable domain this host sits under, if any. */
function firstPartyBrand(host) {
  for (const domain of Object.keys(BRANDS)) {
    if (host === domain || host.endsWith(`.${domain}`)) return BRANDS[domain];
  }
  return null;
}

/** A brand name appearing in a host that is NOT that brand's domain. */
function lookalikeBrand(host) {
  if (HOSTING.test(host)) {
    // Still worth naming which brand it borrows.
  }
  for (const [domain, label] of Object.entries(BRANDS)) {
    const token = domain.split(".")[0];
    if (token.length >= 4 && host.includes(token)) return label;
  }
  return null;
}

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
  const borrowed = lookalikeBrand(host);
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
  say("| borrows | host | endpoints |");
  say("| --- | --- | --- |");
  const rows = [];
  for (const [brand, hosts] of lookalike) {
    for (const [host, count] of hosts) rows.push({ brand, host, count });
  }
  rows.sort((a, b) => b.count - a.count);
  for (const r of rows.slice(0, 40)) {
    say(`| ${r.brand} | ${r.host} | ${r.count} |`);
  }
  if (rows.length > 40) say(`| … | _${rows.length - 40} more_ | |`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
}
