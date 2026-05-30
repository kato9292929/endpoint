import { CatalogExplorer } from "@/components/CatalogExplorer";
import { StatsBar } from "@/components/StatsBar";
import {
  getCatalog,
  getCategoryCounts,
  getNetworks,
  getProtocols,
  getSourceCounts,
} from "@/lib/data";

// Rebuild at most once per day; the daily fetch job pushes fresh data.
export const revalidate = 86400;

export default function HomePage() {
  const { endpoints, generated_at } = getCatalog();
  const networks = getNetworks();
  const protocols = getProtocols();
  const categoryCounts = getCategoryCounts();
  const sourceCounts = getSourceCounts();

  const updated = new Date(generated_at);
  const updatedLabel = isNaN(updated.getTime())
    ? "—"
    : updated.toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">x402 Endpoint</h1>
        <p className="text-muted">6 directories. 1 catalog.</p>
        <p className="text-sm text-muted/80 max-w-2xl">
          Aggregating x402 directories — and the x402 endpoints that x402 Inc.
          contributes to them.
        </p>
      </header>

      <StatsBar
        total={endpoints.length}
        networks={networks.length}
        categories={Object.values(categoryCounts).filter((c) => c > 0).length}
        directories={Object.keys(sourceCounts).length}
        updated={updatedLabel}
      />

      <CatalogExplorer
        endpoints={endpoints}
        networks={networks.map((n) => n.name)}
        protocols={protocols.map((p) => p.name)}
      />
    </div>
  );
}
