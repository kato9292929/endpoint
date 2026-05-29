# x402 Endpoint

**6 directories. 1 catalog.**

A cross-directory unified catalog of x402 ecosystem endpoints. The x402
ecosystem has several community-maintained directories running in parallel;
this is a static site that aggregates them into a single browsable catalog so
you don't have to check each one individually.

Aggregated directories:

| Source | Site |
| --- | --- |
| x402scan (Merit Systems) | https://x402scan.com |
| Agentic.Market (Base) | https://agentic.market |
| Pay.sh (Solana) | https://pay.sh |
| Ampersend | https://app.ampersend.ai/discover |
| Visa CLI Merchant Registry | https://app.visacli.sh/merchants |
| Circle Agent Marketplace | https://agents.circle.com |

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Fuse.js** for client-side search
- Deployed on **Vercel**

## Architecture

Static site + daily batch fetch:

1. **`scripts/fetch-directories.ts`** runs each per-directory fetcher, dedupes
   by canonical URL, merges cross-directory duplicates, and writes the unified
   **`data/endpoints.json`**.
2. **Next.js pages** read `data/endpoints.json` in server components and render
   it. Pages use ISR (`revalidate = 86400`) so they refresh at most once a day.
3. **GitHub Actions** (`.github/workflows/daily-fetch.yml`) runs the fetch on a
   daily cron, commits the updated JSON, and pushes — Vercel redeploys on push.

```
scripts/
  fetch-directories.ts      # orchestrator: collect → dedupe → write
  util.ts                   # canonical URL, hashing, merge, throttle
  fetchers/
    x402scan.ts             # one fetcher per directory (currently stubs)
    agentic-market.ts
    pay-sh.ts
    ampersend.ts
    visa-cli.ts
    circle-marketplace.ts
src/
  app/
    page.tsx                # top: stats + filters + catalog
    network/[name]/page.tsx # endpoints by network
    category/[name]/page.tsx# endpoints by category
    directory/[name]/page.tsx# endpoints by source directory
    about/page.tsx          # sources, update frequency, disclaimer
  components/               # cards, grid, filters, stats, footer
  lib/                      # types + data-access helpers
data/
  endpoints.json            # the published unified catalog
```

## Unified data format

See `src/lib/types.ts`. Each entry:

```ts
type Endpoint = {
  id: string;            // stable hash of the canonical URL
  url: string;
  name: string;
  description: string;
  category: "data" | "compute" | "search" | "media" | "trading" | "messaging" | "other";
  price?: { amount: number; currency: string; unit: string };
  networks: string[];    // Base, Solana, Polygon, ...
  protocols: string[];   // x402, MPP, L402
  source: DirectorySource[]; // every directory the URL was seen in
  source_url: string;
  last_seen: string;     // ISO 8601
};
```

When the same URL appears in multiple directories the records are merged and
`source` holds every directory it was seen in.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run fetch        # run the directory fetchers and rebuild data/endpoints.json
npm run typecheck
npm run build
```

`data/endpoints.json` ships with sample data so the site renders before any
fetcher is implemented. The fetchers are currently stubs (`return []`) — the
orchestrator leaves the existing JSON untouched when nothing is fetched, so the
sample data survives until real fetchers land.

## Implementing a fetcher

Each fetcher exports an `async` function returning `Promise<Endpoint[]>` and
maps a directory's listings into the unified shape. When implementing:

- **Prefer a public API.** x402scan, Agentic.Market, and Circle are likely to
  offer APIs (GraphQL or REST) — use those over HTML scraping.
- **Respect `robots.txt` and terms of service.** Don't scrape where it's
  disallowed. The Visa CLI Merchant Registry is invite-only; confirm the
  merchant list may be republished before enabling that fetcher.
- **Be polite.** Keep at least 1 second between requests (`sleep` in
  `scripts/util.ts`).
- **Fail soft.** Throwing from a fetcher only skips that directory; the rest
  still run.
- For directories that can't be fetched automatically, maintaining a manual
  JSON is an acceptable fallback.

## Contributing

No sign-up, submission form, or dynamic features. To add or correct an
endpoint, open a pull request — everything is PR-based.

## Deployment

Connect the repo to Vercel. The daily GitHub Actions job pushes fresh data and
Vercel redeploys automatically; ISR revalidates pages once per day.

## Disclaimer

- Data reflects each directory as of its fetch time (shown in the footer).
- Accuracy and availability of each endpoint depend on the originating
  directory.
- Use of any endpoint is subject to that endpoint's own terms of service.
- This site is informational and is **not investment advice**.
