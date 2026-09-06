// Shared types for the x402 Endpoint unified catalog.
// Mirrored by scripts/fetchers so fetchers and the site agree on shape.

export type Category =
  | "data" // market data, onchain data, news
  | "intelligence" // analytics, screeners, signals, research
  | "oracle" // price feeds, onchain oracles
  | "compliance" // KYC, AML, identity
  | "compute" // LLM, image gen, video gen
  | "search" // web search, semantic search
  | "media" // music, image, video assets
  | "trading" // trade execution, market access
  | "messaging" // email, sms, notification
  | "other";

export type DirectorySource =
  | "x402-inc"
  | "x402scan"
  | "onyx-bazaar"
  | "agentic-market"
  | "pay-sh"
  | "ampersend"
  | "visa-cli"
  | "circle-marketplace"
  | "402index"
  | "cdp-bazaar"
  | "gold-402"
  | "well-known"
  | "community";

export type Protocol = "x402" | "MPP" | "L402" | (string & {});

export type Price = {
  amount: number;
  currency: string; // USDC | EURC | USD ...
  unit: string; // per-call | per-token ...
};

export type Endpoint = {
  id: string; // stable hash of the canonical URL
  url: string; // endpoint URL
  name: string; // display name
  description: string; // short description
  category: Category;
  price?: Price;
  networks: string[]; // Base, Solana, Polygon, ...
  protocols: Protocol[]; // x402, MPP, L402
  // When the same URL appears in multiple directories the records are
  // merged and `source` holds every directory it was seen in.
  source: DirectorySource[];
  source_url: string; // URL in the originating directory
  last_seen: string; // ISO 8601
  // Upstream popularity signal (e.g. x402scan cumulative tool calls). Absent
  // when no source provides one. `popularity_metric` names what it counted;
  // never write a bare popularity number without its metric.
  popularity?: number;
  popularity_metric?: string; // e.g. "x402scan:toolCalls"
  // Optional health/verification signals — only present when a source provides
  // them. Never fill missing signals with 0 / "unknown".
  health?: EndpointHealth;
  verification?: EndpointVerification;
};

export type EndpointHealth = {
  status: "healthy" | "degraded" | "down" | "unknown";
  uptime_30d?: number; // 0..1
  latency_p50_ms?: number;
  reliability_score?: number; // 0..100
  last_checked?: string; // ISO 8601
};

export type EndpointVerification = {
  domain_verified?: boolean;
  payment_valid?: boolean;
  probed_at?: string; // ISO 8601
};

// Per-source outcome of a fetch run. Always written to the catalog so an
// implemented source silently returning 0 is detectable.
export type FetchStatus = "ok" | "failed" | "empty" | "stub";

export type FetchReportEntry = {
  source: string;
  status: FetchStatus;
  count: number;
  error?: string;
};

export type Catalog = {
  generated_at: string; // ISO 8601 — when this file was produced
  count: number;
  // Always present (not optional). One entry per fetcher.
  fetch_report: FetchReportEntry[];
  // How many endpoints carry a `popularity` value (ranking-signal coverage).
  popularity_coverage: number;
  endpoints: Endpoint[];
};

export const CATEGORIES: Category[] = [
  "data",
  "intelligence",
  "oracle",
  "compliance",
  "compute",
  "search",
  "media",
  "trading",
  "messaging",
  "other",
];

export const DIRECTORY_SOURCES: DirectorySource[] = [
  "x402-inc",
  "x402scan",
  "onyx-bazaar",
  "agentic-market",
  "pay-sh",
  "ampersend",
  "visa-cli",
  "circle-marketplace",
  "402index",
  "cdp-bazaar",
  "gold-402",
  "well-known",
  "community",
];

export const DIRECTORY_META: Record<
  DirectorySource,
  { label: string; home: string }
> = {
  "x402-inc": { label: "x402 Inc.", home: "https://x402jp.com" },
  x402scan: { label: "x402scan", home: "https://x402scan.com" },
  "onyx-bazaar": {
    label: "Onyx Bazaar",
    home: "https://onyx-actions.onrender.com/bazaar",
  },
  "agentic-market": { label: "Agentic.Market", home: "https://agentic.market" },
  "pay-sh": { label: "Pay.sh", home: "https://pay.sh" },
  ampersend: { label: "Ampersend", home: "https://app.ampersend.ai/discover" },
  "visa-cli": {
    label: "Visa CLI Merchant Registry",
    home: "https://app.visacli.sh/merchants",
  },
  "circle-marketplace": {
    label: "Circle Agent Marketplace",
    home: "https://agents.circle.com",
  },
  "402index": { label: "402 Index", home: "https://402index.io" },
  "cdp-bazaar": {
    label: "CDP Bazaar",
    home: "https://docs.cdp.coinbase.com/x402/bazaar",
  },
  "gold-402": {
    label: "gold-402 (24K Labs)",
    home: "https://github.com/Haustorium12/gold-402",
  },
  // .well-known/x402 read directly from an endpoint's own host.
  "well-known": {
    label: ".well-known/x402 (direct)",
    home: "https://x402.org",
  },
  // Third-party endpoints contributed by PR to data/seed/community.json.
  community: {
    label: "Community submissions",
    home: "https://github.com/kato9292929/endpoint",
  },
};

export const CATEGORY_LABELS: Record<Category, string> = {
  data: "Data",
  intelligence: "Intelligence",
  oracle: "Oracle",
  compliance: "Compliance",
  compute: "Compute",
  search: "Search",
  media: "Media",
  trading: "Trading",
  messaging: "Messaging",
  other: "Other",
};
