import type { NextRequest } from "next/server";
import { apiJson, OPTIONS } from "@/lib/api";
import {
  getCatalog,
  getCategoryCounts,
  getNetworks,
  getProtocols,
  getSourceCounts,
} from "@/lib/data";
import { buildSeries } from "@/lib/stats-history";

export { OPTIONS };

// Read snapshots at request time so a same-day cron commit shows up without a
// rebuild (the cron push also triggers a Vercel redeploy).
export const dynamic = "force-dynamic";

// GET /api/stats?range=14d|30d|all
// Current aggregate counts for the whole catalog, plus a daily time series
// (`points`) of committed snapshots and the list of `missing` dates.
export function GET(req: NextRequest) {
  const { generated_at, endpoints } = getCatalog();
  const categories = Object.fromEntries(
    Object.entries(getCategoryCounts()).filter(([, n]) => n > 0),
  );

  const { range, points, missing } = buildSeries(
    req.nextUrl.searchParams.get("range"),
  );

  return apiJson(
    {
      generated_at,
      total: endpoints.length,
      sources: getSourceCounts(),
      categories,
      networks: Object.fromEntries(getNetworks().map((n) => [n.name, n.count])),
      protocols: Object.fromEntries(getProtocols().map((p) => [p.name, p.count])),
      // time series
      range,
      points,
      missing,
    },
    { cache: false },
  );
}
