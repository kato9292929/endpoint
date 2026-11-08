// public/logos/<slug> — one icon per service, fetched from the service's own
// site and committed.
//
// Deliberately not hotlinking a third-party favicon service: those rate-limit,
// go away (Clearbit's logo API did), and would put every visitor's request for
// our page in front of someone else's server. 359 icons at a few KB each cost
// nothing to store and nothing to serve.
//
// Only runs where the network is open — the daily GitHub Actions job. It never
// fails the run: a service without an icon renders a monogram instead, and
// every host that refuses is listed at the end so the reason is visible.
//
// Usage: node scripts/fetch-logos.mjs [--force] [--limit N] [--concurrency N]

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { BRANDS } from "./brands.mjs";

const ROOT = process.cwd();
const SERVICES = join(ROOT, "data", "services.json");
const OUT_DIR = join(ROOT, "public", "logos");

const TIMEOUT_MS = 8000;
const DEFAULT_CONCURRENCY = 8;
/** Anything larger is a hero image someone mislabelled, not an icon. */
const MAX_BYTES = 200 * 1024;

const EXT = {
  "image/png": "png",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Best first: a touch icon is made to be seen at size, a favicon is made to be
// seen at 16px.
const PATHS = [
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/icon.png",
  "/logo.png",
  "/favicon.svg",
  "/favicon.png",
  "/favicon.ico",
];

const ICON_REL = /<link[^>]+rel=["']?[^"'>]*icon[^"'>]*["']?[^>]*>/gi;
const HREF = /href=["']([^"']+)["']/i;

async function get(url, { asText = false } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        // A plain, honest client name. Never the user's email: a site asking
        // automated clients for a contact address is not a reason to hand one
        // over.
        "User-Agent": "x402-endpoint-logo-fetcher/1.0 (+https://x402endpoint.com)",
        Accept: asText ? "text/html,*/*" : "image/*,*/*",
      },
    });
    if (!res.ok) return null;
    if (asText) return { text: await res.text(), url: res.url };
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_BYTES) return null;
    return { buf, type, url: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Icons declared in the page's own <head>, most specific first. */
async function declaredIcons(origin) {
  const page = await get(origin, { asText: true });
  if (!page?.text) return [];
  const out = [];
  for (const tag of page.text.slice(0, 200_000).match(ICON_REL) ?? []) {
    const href = tag.match(HREF)?.[1];
    if (!href) continue;
    try {
      out.push(new URL(href, page.url).href);
    } catch {
      // a malformed href is not worth a failure
    }
  }
  return out;
}

function looksLikeImage(buf, type) {
  if (EXT[type]) return true;
  // Content-Type lies often enough to be worth sniffing the magic bytes.
  const b = buf;
  if (b[0] === 0x89 && b[1] === 0x50) return true; // PNG
  if (b[0] === 0xff && b[1] === 0xd8) return true; // JPEG
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01) return true; // ICO
  if (b.slice(0, 4).toString("ascii") === "RIFF") return true; // WEBP
  if (b.slice(0, 5).toString("utf8").trim().startsWith("<svg")) return true;
  if (b.slice(0, 6).toString("ascii").startsWith("GIF8")) return true;
  return false;
}

function extFor(buf, type, url) {
  if (EXT[type]) return EXT[type];
  const fromUrl = url.split("?")[0].match(/\.([a-z0-9]{2,4})$/i)?.[1]?.toLowerCase();
  if (fromUrl && Object.values(EXT).includes(fromUrl)) return fromUrl;
  if (buf[0] === 0x89) return "png";
  if (buf[0] === 0xff) return "jpg";
  if (buf.slice(0, 5).toString("utf8").trim().startsWith("<svg")) return "svg";
  return "ico";
}

async function iconForHost(host) {
  const origin = `https://${host}`;
  const candidates = [...(await declaredIcons(origin)), ...PATHS.map((p) => origin + p)];
  for (const url of candidates) {
    const got = await get(url);
    if (!got) continue;
    if (!looksLikeImage(got.buf, got.type)) continue;
    return { buf: got.buf, ext: extFor(got.buf, got.type, got.url), from: url };
  }
  return null;
}

function existingFor(slug) {
  if (!existsSync(OUT_DIR)) return null;
  for (const f of readdirSync(OUT_DIR)) {
    if (f.replace(/\.[a-z0-9]+$/i, "") === slug) return f;
  }
  return null;
}

async function pool(items, size, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  });
  await Promise.all(runners);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const n = (flag, dflt) => {
    const i = args.indexOf(flag);
    return i >= 0 ? Number(args[i + 1]) : dflt;
  };
  const limit = n("--limit", Infinity);
  const concurrency = n("--concurrency", DEFAULT_CONCURRENCY);

  if (!existsSync(SERVICES)) {
    console.log("no data/services.json — run scripts/write-services.mjs first");
    return;
  }
  const { services } = JSON.parse(readFileSync(SERVICES, "utf8"));
  mkdirSync(OUT_DIR, { recursive: true });

  // Where to fetch a known company's mark: its own domain, never the gateway's
  // host. "Cloudflare via PayWeave" is Cloudflare's API, and Cloudflare's logo
  // identifies it correctly; the 3P badge next to it already says the listing
  // is not Cloudflare's own. Taking the icon from payweave.services instead
  // would put the gateway's mark on the company's row, which is the one thing
  // this catalog must not do.
  const brandDomain = new Map();
  for (const [domain, label] of Object.entries(BRANDS)) {
    if (!brandDomain.has(label)) brandDomain.set(label, domain);
  }

  const targets = services
    .filter((s) => s.hosts?.length || brandDomain.has(s.name))
    .filter((s) => force || !existingFor(s.slug))
    .slice(0, limit);

  console.log(
    `logos: ${targets.length} to fetch (${services.length} services, ` +
      `${services.filter((s) => existingFor(s.slug)).length} already have one)`,
  );

  let ok = 0;
  const failed = [];
  await pool(targets, concurrency, async (svc) => {
    // api.exa.ai serves no favicon; exa.ai does. Try the service's own hosts
    // first, then the domain itself, which is where a company actually puts
    // its mark.
    const tries = [];
    if (svc.party === "3P") {
      // Only the company's own domain. Its hosts belong to gateways.
      const d = brandDomain.get(svc.name);
      if (d) tries.push(d, `www.${d}`);
    } else {
      tries.push(...svc.hosts.slice(0, 2));
      if (svc.domain && !tries.includes(svc.domain)) tries.push(svc.domain);
      if (svc.domain && !tries.includes(`www.${svc.domain}`)) {
        tries.push(`www.${svc.domain}`);
      }
    }
    if (tries.length === 0) {
      failed.push(svc.name);
      return;
    }

    let got = null;
    for (const host of tries) {
      got = await iconForHost(host);
      if (got) break;
    }
    if (!got) {
      failed.push(svc.hosts?.[0] ?? svc.name);
      return;
    }
    const prev = existingFor(svc.slug);
    if (prev && prev !== `${svc.slug}.${got.ext}`) unlinkSync(join(OUT_DIR, prev));
    writeFileSync(join(OUT_DIR, `${svc.slug}.${got.ext}`), got.buf);
    ok++;
  });

  console.log(`logos: ${ok} fetched, ${failed.length} without one`);
  if (failed.length) {
    console.log(`  no icon: ${failed.slice(0, 40).join(", ")}${failed.length > 40 ? ", …" : ""}`);
  }
}

// Never fail the daily run over a decoration.
await main().catch((err) => {
  console.warn(`::warning::logos: skipped — ${err.message}`);
});
