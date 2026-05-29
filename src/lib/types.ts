// Shared types for the x402 Endpoint unified catalog.
// Mirrored by scripts/fetchers so fetchers and the site agree on shape.

export type Category =
  | "data" // market data, onchain data, news
  | "compute" // LLM, image gen, video gen
  | "search" // web search, semantic search
  | "media" // music, image, video assets
  | "trading" // trade execution, market access
  | "messaging" // email, sms, notification
  | "other";

export type DirectorySource =
  | "x402scan"
  | "agentic-market"
  | "pay-sh"
  | "ampersend"
  | "visa-cli"
  | "circle-marketplace";

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
};

export type Catalog = {
  generated_at: string; // ISO 8601 — when this file was produced
  count: number;
  endpoints: Endpoint[];
};

export const CATEGORIES: Category[] = [
  "data",
  "compute",
  "search",
  "media",
  "trading",
  "messaging",
  "other",
];

export const DIRECTORY_SOURCES: DirectorySource[] = [
  "x402scan",
  "agentic-market",
  "pay-sh",
  "ampersend",
  "visa-cli",
  "circle-marketplace",
];

export const DIRECTORY_META: Record<
  DirectorySource,
  { label: string; home: string }
> = {
  x402scan: { label: "x402scan", home: "https://x402scan.com" },
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
};

export const CATEGORY_LABELS: Record<Category, string> = {
  data: "Data",
  compute: "Compute",
  search: "Search",
  media: "Media",
  trading: "Trading",
  messaging: "Messaging",
  other: "Other",
};
