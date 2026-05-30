import { NextResponse, type NextRequest } from "next/server";

// Best-effort, in-memory IP rate limit for the public API.
//
// Deliberately simple: a fixed-window counter in a module-level Map. State
// lives per edge isolate and resets when the isolate recycles, so this is NOT
// a hard guarantee — it only blunts obvious hammering. We'll swap in a durable
// limiter (e.g. Upstash) if/when abuse patterns warrant it. No Vercel KV.

export const config = { matcher: "/api/:path*" };

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 120; // per IP per window

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function middleware(req: NextRequest) {
  // Never throttle CORS preflight.
  if (req.method === "OPTIONS") return NextResponse.next();

  const ip = clientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);

  let current: Bucket;
  if (!bucket || now >= bucket.resetAt) {
    current = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, current);
  } else {
    bucket.count++;
    current = bucket;
  }

  // Opportunistic cleanup so the Map can't grow unbounded.
  if (buckets.size > 10_000) {
    for (const [key, b] of buckets) if (now >= b.resetAt) buckets.delete(key);
  }

  const remaining = Math.max(0, MAX_REQUESTS - current.count);
  const headers = {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(current.resetAt / 1000)),
  };

  if (current.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)),
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
