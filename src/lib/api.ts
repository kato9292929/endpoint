import { NextResponse } from "next/server";

// The catalog only changes on redeploy (data is bundled at build time), so API
// responses are safe to cache hard at the edge for a day with SWR.
const CACHE = "public, s-maxage=86400, stale-while-revalidate=86400";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function apiJson(data: unknown, init?: { status?: number; cache?: boolean }) {
  const headers: Record<string, string> = { ...CORS };
  if (init?.cache !== false) headers["Cache-Control"] = CACHE;
  return NextResponse.json(data, { status: init?.status ?? 200, headers });
}

export function apiError(message: string, status = 400) {
  return apiJson({ error: message }, { status, cache: false });
}

// Shared preflight handler for the API routes.
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
