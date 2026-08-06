import { apiJson, OPTIONS } from "@/lib/api";
import { getHosts, getHostCount } from "@/lib/hosts";

export { OPTIONS };

// GET /api/hosts — per-host route aggregation (routes, top category, median
// price), most routes first.
export function GET() {
  const hosts = getHosts();
  return apiJson({
    host_count: getHostCount(),
    total_routes: hosts.reduce((s, h) => s + h.count, 0),
    hosts,
  });
}
