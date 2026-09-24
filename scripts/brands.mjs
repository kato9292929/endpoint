// Deciding whether an endpoint is really served BY a company, or merely names
// one.
//
// Anyone can publish an x402 endpoint called "CoinGecko Price API" on their own
// domain, and the catalog lists it as faithfully as the real one. The only
// evidence that a company itself serves x402 is a host under a domain that
// company controls. Everything else is somebody's wrapper.
//
//   first-party   pro-api.coingecko.com            → coingecko.com   ✓
//   borrowed      coingecko.x402.paywithlocus.com  → a gateway       ✗
//
// Shared by scripts/find-brands.mjs (the report) and
// scripts/write-providers.mjs (the artifact the site renders).

// Registrable domains of companies a reader would recognize. Matching is on
// the domain, never on the word, so "x402nansen….vercel.app" cannot pass as
// Nansen. Adding an entry only widens what gets reported.
export const BRANDS = {
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
  "birdeye.so": "Birdeye",
  "vybenetwork.xyz": "Vybe Network",
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
  "venice.ai": "Venice.ai",
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
  "wolframalpha.com": "Wolfram Alpha",
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
  "tripadvisor.com": "Tripadvisor",
  "dynamicauth.com": "Dynamic",
  "google.com": "Google",
  "googleapis.com": "Google",
  "cloudflare.com": "Cloudflare",
  "supabase.com": "Supabase",
};

// Domains that host other people's code. A host under one of these says
// nothing about who operates the endpoint, so it is never first-party for
// anyone — including for the platform itself. `*.supabase.co` is a customer's
// project, not Supabase; `ec2-….amazonaws.com` is somebody's instance, not AWS.
export const HOSTING =
  /(^|\.)(vercel\.app|netlify\.app|onrender\.com|render\.com|railway\.app|up\.railway\.app|fly\.dev|herokuapp\.com|workers\.dev|pages\.dev|trycloudflare\.com|pythonanywhere\.com|supabase\.co|amazonaws\.com|azurewebsites\.net|appspot\.com|firebaseapp\.com|web\.app|repl\.co|replit\.dev|ngrok\.io|ngrok-free\.app|glitch\.me|surge\.sh|duckdns\.org|serveo\.net|loca\.lt)$/i;

// Operators that put OTHER companies' APIs behind x402. An endpoint here is
// the gateway's, not the named company's, however the listing is titled.
export const GATEWAYS = {
  "gateway-402.com": "gateway-402 (Solana Foundation)",
  "paysponge.com": "PaySponge",
  "paywithlocus.com": "Locus",
  "x402atlas.com": "x402 Atlas",
  "payweave.services": "PayWeave",
  "fetcher.sh": "fetcher.sh",
};

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function under(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

/** The gateway operator serving this host, if it is one. */
export function gatewayOf(host) {
  for (const [domain, label] of Object.entries(GATEWAYS)) {
    if (under(host, domain)) return label;
  }
  return null;
}

/**
 * The brand whose own domain this host sits under — the only case where the
 * company itself can be said to serve the endpoint. Hosting and gateway
 * domains never qualify.
 */
export function firstPartyBrand(host) {
  if (!host || HOSTING.test(host) || gatewayOf(host)) return null;
  for (const [domain, label] of Object.entries(BRANDS)) {
    if (under(host, domain)) return label;
  }
  return null;
}

/**
 * A brand name that merely appears in a host which is NOT that brand's domain.
 * Reported separately so it can never be quoted as the company's own.
 */
export function borrowedBrand(host) {
  if (!host || firstPartyBrand(host)) return null;
  for (const [domain, label] of Object.entries(BRANDS)) {
    const token = domain.split(".")[0];
    if (token.length >= 4 && host.includes(token)) return label;
  }
  return null;
}
