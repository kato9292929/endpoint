import Link from "next/link";
import { getHosts, hostStats } from "@/lib/hosts";
import { CATEGORY_LABELS } from "@/lib/types";

export const revalidate = 86400;
export const metadata = { title: "Hosts — x402 Endpoint" };

const TOP_N = 100;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export default function HostsPage() {
  const hosts = getHosts();
  const s = hostStats();
  const shown = hosts.slice(0, TOP_N);
  const hidden = hosts.length - shown.length;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/" className="text-xs text-muted hover:text-black">
          ← Catalog
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Hosts</h1>
        <p className="max-w-3xl text-sm text-muted">
          A host&apos;s route count reflects the{" "}
          <span className="text-black">granularity of its route expansion</span>
          , not the operator&apos;s size: the top hosts are each a single
          service that turns one dataset or wrapper into hundreds–thousands of
          per-query routes. So {s.totalRoutes.toLocaleString()} routes come from
          only {s.hostCount.toLocaleString()} hosts.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm sm:grid-cols-4">
        <Stat label="routes" value={s.totalRoutes.toLocaleString()} />
        <Stat label="hosts" value={s.hostCount.toLocaleString()} />
        <Stat
          label="median routes / host"
          value={s.routesPerHostMedian ?? "—"}
        />
        <Stat
          label="hosts with 1 route"
          value={s.singleRouteHosts.toLocaleString()}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="hidden grid-cols-[2.5rem_minmax(0,2.4fr)_5rem_4rem_6rem_minmax(0,1fr)] gap-x-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
          <span>#</span>
          <span>Service</span>
          <span className="text-right">Routes</span>
          <span className="text-right">Share</span>
          <span className="text-right">Median price</span>
          <span>Top category</span>
        </div>
        {shown.map((h, i) => (
          <div
            key={h.host}
            id={h.host}
            className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 border-b border-border px-3 py-2 text-sm scroll-mt-20 md:grid-cols-[2.5rem_minmax(0,2.4fr)_5rem_4rem_6rem_minmax(0,1fr)]"
          >
            <span className="tabular-nums text-muted">{i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{h.serviceName}</span>
              <a
                href={`https://${h.host}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-xs text-muted hover:text-accent"
              >
                {h.host}
              </a>
            </span>
            <span className="text-right tabular-nums">
              {h.count.toLocaleString()}
            </span>
            <span className="hidden text-right tabular-nums text-muted md:block">
              {(h.share * 100).toFixed(1)}%
            </span>
            <span className="hidden text-right tabular-nums text-muted md:block">
              {h.priceMedian == null ? "—" : `${h.priceMedian} USDC`}
            </span>
            <span className="hidden text-[11px] uppercase tracking-wide text-muted md:block">
              {h.topCategory ? CATEGORY_LABELS[h.topCategory] : "—"}
            </span>
          </div>
        ))}
        {hidden > 0 ? (
          <div className="px-3 py-2 text-[11px] text-muted">
            Showing the top {TOP_N} of {hosts.length.toLocaleString()} hosts. The
            rest are in{" "}
            <Link href="/api/hosts" className="text-accent hover:underline">
              /api/hosts
            </Link>
            .
          </div>
        ) : null}
      </div>
    </div>
  );
}
