import Link from "next/link";
import { getHosts, getHostCount } from "@/lib/hosts";
import { CATEGORY_LABELS } from "@/lib/types";

export const revalidate = 86400;
export const metadata = { title: "Hosts — x402 Endpoint" };

export default function HostsPage() {
  const hosts = getHosts();
  const totalRoutes = hosts.reduce((s, h) => s + h.count, 0);
  const hostCount = getHostCount();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-xs text-muted hover:text-black">
          ← Catalog
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Hosts</h1>
        <p className="max-w-2xl text-sm text-muted">
          {totalRoutes.toLocaleString()} routes across{" "}
          {hostCount.toLocaleString()} hosts. The catalog counts{" "}
          <span className="text-black">routes, not services</span> — a single
          host can expose hundreds of x402 routes.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="hidden grid-cols-[2.5rem_minmax(0,2fr)_5rem_minmax(0,1fr)_6rem] gap-x-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
          <span>#</span>
          <span>Host</span>
          <span className="text-right">Routes</span>
          <span>Top category</span>
          <span className="text-right">Median price</span>
        </div>
        {hosts.map((h, i) => (
          <div
            key={h.host}
            id={h.host}
            className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 border-b border-border px-3 py-2 text-sm scroll-mt-20 md:grid-cols-[2.5rem_minmax(0,2fr)_5rem_minmax(0,1fr)_6rem]"
          >
            <span className="tabular-nums text-muted">{i + 1}</span>
            <a
              href={`https://${h.host}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate font-medium hover:text-accent"
            >
              {h.host}
            </a>
            <span className="text-right tabular-nums">
              {h.count.toLocaleString()}
            </span>
            <span className="hidden text-[11px] uppercase tracking-wide text-muted md:block">
              {h.topCategory ? CATEGORY_LABELS[h.topCategory] : "—"}
            </span>
            <span className="hidden text-right tabular-nums text-muted md:block">
              {h.priceMedian == null ? "—" : `${h.priceMedian} USDC`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
