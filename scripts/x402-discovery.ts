// Shared mapping from x402 "discovery resource" shapes into our unified
// Endpoint type. Both the Onyx Bazaar (bazaar.json, sourced from the Coinbase
// CDP discovery API) and x402scan expose resources that follow the x402
// discovery schema, so they share this mapper.
//
// A discovery resource looks like (V1 / CDP shape):
//   { resource, type, x402Version, accepts: PaymentRequirements[],
//     lastUpdated, metadata }
// with each `accepts` entry carrying maxAmountRequired (atomic units),
// network, asset, description, extra. (V2 uses `amount` and CAIP-2 networks.)

import type { Category, DirectorySource, Endpoint } from "../src/lib/types";
import { hashId } from "./util";

// ── Tolerant input shapes ────────────────────────────

export type AcceptLike = {
  scheme?: string;
  network?: string;
  asset?: string;
  // V1 uses maxAmountRequired; V2 uses amount. Both are atomic-unit strings.
  maxAmountRequired?: string | number;
  amount?: string | number;
  payTo?: string;
  description?: string;
  extra?: Record<string, unknown> | null;
};

export type DiscoveryLike = {
  resource?: string;
  url?: string;
  accepts?: AcceptLike[] | null;
  metadata?: Record<string, unknown> | null;
  lastUpdated?: string;
  // x402scan enrichments:
  origin?: { title?: string | null; description?: string | null } | null;
  tags?: ({ tag?: { name?: string } | null } | string)[] | null;
};

export type MapOptions = {
  source: DirectorySource;
  // Build the URL back to the originating directory for this resource.
  sourceUrl: (resource: DiscoveryLike, url: string) => string;
};

// ── Known assets (address → currency + decimals) ─────
// x402 settles in stablecoins; default to USDC/6 when unknown.
const KNOWN_ASSETS: Record<string, { currency: string; decimals: number }> = {
  // Base USDC
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { currency: "USDC", decimals: 6 },
  // Polygon USDC (native)
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": { currency: "USDC", decimals: 6 },
  // Ethereum USDC
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { currency: "USDC", decimals: 6 },
  // Base EURC
  "0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42": { currency: "EURC", decimals: 6 },
  // Solana USDC
  epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v: { currency: "USDC", decimals: 6 },
};

function assetInfo(accept: AcceptLike): { currency: string; decimals: number } {
  const asset = (accept.asset ?? "").toLowerCase();
  if (asset && KNOWN_ASSETS[asset]) return KNOWN_ASSETS[asset];
  // Fall back to the EIP-712 name in `extra` (USDC tokens advertise it there).
  const name = String(
    (accept.extra?.name as string) ?? (accept.extra?.symbol as string) ?? "",
  ).toUpperCase();
  if (name.includes("EUR")) return { currency: "EURC", decimals: 6 };
  return { currency: "USDC", decimals: 6 };
}

// ── Network display normalization ────────────────────
const NETWORK_DISPLAY: Record<string, string> = {
  base: "Base",
  "base-mainnet": "Base",
  base_mainnet: "Base",
  "eip155:8453": "Base",
  "base-sepolia": "Base Sepolia",
  base_sepolia: "Base Sepolia",
  "eip155:84532": "Base Sepolia",
  solana: "Solana",
  "solana-mainnet": "Solana",
  solana_devnet: "Solana Devnet",
  "solana-devnet": "Solana Devnet",
  polygon: "Polygon",
  "eip155:137": "Polygon",
  ethereum: "Ethereum",
  "eip155:1": "Ethereum",
  avalanche: "Avalanche",
  "eip155:43114": "Avalanche",
  avalanche_fuji: "Avalanche Fuji",
  optimism: "Optimism",
  "eip155:10": "Optimism",
  arbitrum: "Arbitrum",
  sei: "Sei",
  iotex: "IoTeX",
  peaq: "Peaq",
};

function networkDisplay(raw?: string): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase();
  if (NETWORK_DISPLAY[key]) return NETWORK_DISPLAY[key];
  // CAIP-2 like "solana:5eyk..." → take the namespace.
  if (key.includes(":")) {
    const ns = key.split(":")[0];
    if (NETWORK_DISPLAY[ns]) return NETWORK_DISPLAY[ns];
    return ns.charAt(0).toUpperCase() + ns.slice(1);
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Category heuristic ───────────────────────────────
const CATEGORY_RULES: { category: Category; words: RegExp }[] = [
  { category: "messaging", words: /\b(email|sms|otp|notif|message|telegram|discord|webhook|push)\b/i },
  { category: "search", words: /\b(search|retriev|index|lookup|scrape|crawl|serp)\b/i },
  { category: "trading", words: /\b(trade|trading|swap|dex|execution|order|liquidity|perp|portfolio)\b/i },
  { category: "media", words: /\b(music|audio|video|image gen|stock photo|photo|asset|render|tts|voice)\b/i },
  { category: "compute", words: /\b(llm|model|inference|generate|generation|gpu|ocr|embedding|chat|completion|transcrib|speech|vision|agent)\b/i },
  { category: "data", words: /\b(data|price|prices|quote|market|onchain|on-chain|weather|news|feed|analytics|stats|finance|token)\b/i },
];

function deriveCategory(text: string): Category {
  for (const rule of CATEGORY_RULES) {
    if (rule.words.test(text)) return rule.category;
  }
  return "other";
}

// ── Helpers ──────────────────────────────────────────
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function tagNames(tags: DiscoveryLike["tags"]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === "string" ? t : str(t?.tag?.name)))
    .filter((x): x is string => Boolean(x));
}

function nameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    const host = u.hostname.replace(/^www\./, "");
    return seg ? `${host} · ${seg}` : host;
  } catch {
    return url;
  }
}

function amountOf(accept: AcceptLike): string | number | undefined {
  return accept.maxAmountRequired ?? accept.amount;
}

function toMajorUnits(atomic: string | number, decimals: number): number {
  const n = typeof atomic === "number" ? atomic : Number(atomic);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

/**
 * Map a single discovery resource to our Endpoint shape.
 * Returns null when there is no usable resource URL.
 */
export function mapDiscoveryResource(
  res: DiscoveryLike,
  opts: MapOptions,
): Endpoint | null {
  const url = str(res.resource) ?? str(res.url);
  if (!url) return null;

  const meta = (res.metadata ?? {}) as Record<string, unknown>;
  const accepts = Array.isArray(res.accepts) ? res.accepts : [];
  const primary = accepts[0];

  // Name: metadata → origin title → first accept description → URL-derived.
  const name =
    str(meta.name) ??
    str(meta.title) ??
    str(meta.displayName) ??
    str(res.origin?.title) ??
    str(primary?.description) ??
    nameFromUrl(url);

  const description =
    str(meta.description) ??
    str(primary?.description) ??
    str(res.origin?.description) ??
    "";

  // Networks: unique, display-normalized, across all accepts.
  const networks = [
    ...new Set(
      accepts
        .map((a) => networkDisplay(a.network))
        .filter((x): x is string => Boolean(x)),
    ),
  ];

  // Price from the first accept.
  let price: Endpoint["price"];
  if (primary) {
    const raw = amountOf(primary);
    if (raw !== undefined) {
      const { currency, decimals } = assetInfo(primary);
      price = {
        amount: toMajorUnits(raw, decimals),
        currency,
        unit: "per-call",
      };
    }
  }

  const category = deriveCategory(
    [name, description, ...tagNames(res.tags), url].join(" "),
  );

  const lastUpdated = str(res.lastUpdated) ?? new Date().toISOString();

  return {
    id: hashId(url),
    url,
    name,
    description,
    category,
    price,
    networks,
    protocols: ["x402"],
    source: [opts.source],
    source_url: opts.sourceUrl(res, url),
    last_seen: lastUpdated,
  };
}

/**
 * Recursively collect discovery-resource-like objects from an arbitrary JSON
 * structure. Onyx's bazaar.json may wrap resources in `{ items: [] }`,
 * `{ resources: [] }`, or a 4-view object (top by volume / unique payers /
 * recently active / cheapest) — this finds them wherever they live and dedups
 * by resource URL so an entry appearing in multiple views is counted once.
 */
export function collectResources(root: unknown): DiscoveryLike[] {
  const byUrl = new Map<string, DiscoveryLike>();

  const looksLikeResource = (o: Record<string, unknown>): boolean =>
    (typeof o.resource === "string" || typeof o.url === "string") &&
    (Array.isArray(o.accepts) || "x402Version" in o || "metadata" in o);

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (looksLikeResource(o)) {
        const key = (o.resource ?? o.url) as string;
        if (!byUrl.has(key)) byUrl.set(key, o as DiscoveryLike);
        return; // don't descend into a resource's own sub-objects
      }
      for (const v of Object.values(o)) walk(v);
    }
  };

  walk(root);
  return [...byUrl.values()];
}
