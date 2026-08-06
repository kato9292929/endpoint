import type { NextRequest } from "next/server";
import { apiJson, OPTIONS } from "@/lib/api";
import { getRank } from "@/lib/rank";

export { OPTIONS };

// GET /api/rank?limit=1..50 — x402scan most-called origins, re-listed as-is.
// When unavailable, returns { status: "unavailable", rows: [] } at 200 — never
// a substitute ordering.
export function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(50, raw) : 50;
  const r = getRank(limit);
  return apiJson(
    {
      status: r.status,
      metric: r.metric,
      timeframe: r.timeframe,
      sorting: r.sorting,
      generated_at: r.generated_at,
      count: r.rows.length,
      rows: r.rows,
    },
    { cache: false },
  );
}
