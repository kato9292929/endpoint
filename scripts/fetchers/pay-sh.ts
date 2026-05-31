import type { Category, Endpoint } from "../../src/lib/types";
import { hashId, sleep } from "../util";

// Pay.sh (Solana Foundation) — "let your agents pay for any API".
// Its paid-API catalog is open source and machine-readable in the
// solana-foundation/pay-skills repo: one PAY.md per service with YAML
// frontmatter (title, description, category, service_url). We read that repo
// via GitHub's public APIs rather than scraping the site.
//
// Listing: the Git Trees API (one recursive call). Each PAY.md is then fetched
// from raw.githubusercontent. Set GITHUB_TOKEN to raise the API rate limit
// (the daily-fetch workflow passes it through).

const REPO = "solana-foundation/pay-skills";
const BRANCH = "main";
const TREES = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const BLOB = `https://github.com/${REPO}/blob/${BRANCH}`;
const UA = "x402-endpoint catalog (+https://github.com/kato9292929/endpoint)";

// pay-skills categories → our taxonomy. Pay.sh's `finance` covers raw market /
// crypto data, so we map it to `data` rather than the curated `intelligence`.
const CATEGORY_MAP: Record<string, Category> = {
  ai_ml: "compute",
  cloud: "compute",
  compute: "compute",
  data: "data",
  devtools: "compute",
  finance: "data",
  identity: "compliance",
  maps: "data",
  media: "media",
  messaging: "messaging",
  other: "other",
  productivity: "other",
  search: "search",
  security: "other",
  shopping: "other",
  storage: "other",
  translation: "compute",
};

type Frontmatter = Record<string, string>;

// Minimal YAML frontmatter reader: top-level `key: value` pairs between the
// first pair of `---` fences. Nested/indented keys (e.g. openapi:) are skipped.
function parseFrontmatter(md: string): { fm: Frontmatter; body: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: md };
  const fm: Frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line || /^\s/.test(line)) continue; // skip blanks and nested keys
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) fm[key] = val;
  }
  return { fm, body: m[2] ?? "" };
}

// Best-effort price from prose like "$0.01 per request" / "$0.05 per call".
function parsePrice(body: string): Endpoint["price"] | undefined {
  const m = body.match(
    /\$\s?([0-9]+(?:\.[0-9]+)?)\s*(?:per|\/)\s*(?:request|call|query|req)\b/i,
  );
  if (!m) return undefined;
  return { amount: Number(m[1]), currency: "USDC", unit: "per-call" };
}

// Pure mapping from a PAY.md (path + content) to an Endpoint. Exported for tests.
export function payMdToEndpoint(path: string, content: string): Endpoint | null {
  const { fm, body } = parseFrontmatter(content);
  const url = fm.service_url;
  if (!url) return null;

  return {
    id: hashId(url),
    url,
    name: fm.title || fm.name || url,
    description: fm.description || fm.use_case || "",
    category: CATEGORY_MAP[fm.category] ?? "other",
    price: parsePrice(body),
    networks: ["Solana"], // Pay.sh settles on Solana (x402 / MPP)
    protocols: ["x402"],
    source: ["pay-sh"],
    source_url: `${BLOB}/${path}`,
    last_seen: new Date().toISOString(),
  };
}

async function listPayMdPaths(): Promise<string[]> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": UA,
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(TREES, { headers });
  if (!res.ok) throw new Error(`pay-skills tree returned HTTP ${res.status}`);
  const json = (await res.json()) as {
    tree?: { path: string; type: string }[];
  };
  return (json.tree ?? [])
    .filter((t) => t.type === "blob" && t.path.endsWith("/PAY.md"))
    .map((t) => t.path);
}

export async function fetchPaySh(): Promise<Endpoint[]> {
  const paths = await listPayMdPaths();
  const endpoints: Endpoint[] = [];

  for (const path of paths) {
    const res = await fetch(`${RAW}/${path}`, {
      headers: { "user-agent": UA },
    });
    if (!res.ok) continue; // skip a single bad file, keep going
    const mapped = payMdToEndpoint(path, await res.text());
    if (mapped) endpoints.push(mapped);
    await sleep(150); // gentle on the CDN
  }

  return endpoints;
}
