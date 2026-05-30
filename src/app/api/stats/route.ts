import { apiJson, OPTIONS } from "@/lib/api";
import {
  getCatalog,
  getCategoryCounts,
  getNetworks,
  getProtocols,
  getSourceCounts,
} from "@/lib/data";

export { OPTIONS };

// GET /api/stats — aggregate counts for the whole catalog.
export function GET() {
  const { generated_at, endpoints } = getCatalog();
  // Drop empty category buckets for a tidier payload.
  const categories = Object.fromEntries(
    Object.entries(getCategoryCounts()).filter(([, n]) => n > 0),
  );
  return apiJson({
    generated_at,
    total: endpoints.length,
    sources: getSourceCounts(),
    categories,
    networks: Object.fromEntries(getNetworks().map((n) => [n.name, n.count])),
    protocols: Object.fromEntries(getProtocols().map((p) => [p.name, p.count])),
  });
}
