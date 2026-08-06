import type { NextRequest } from "next/server";
import { apiJson, OPTIONS } from "@/lib/api";
import { getRank } from "@/lib/rank";

export { OPTIONS };

// GET /api/rank?limit=1..50 — x402scan most-called, re-listed as-is.
// When unavailable, returns { status: "unavailable", rows: [] } — never a fake
// order at 200.
export function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(50, raw) : 50;
  const { status, metric, rows } = getRank(limit);
  return apiJson({ status, metric, count: rows.length, rows }, { cache: false });
}
