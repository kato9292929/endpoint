import Link from "next/link";
import { getRank } from "@/lib/rank";
import { getHosts, getHostCount } from "@/lib/hosts";

// Homepage "what's actually active" block. Two parts:
//  1. x402scan most-called ranking — re-listed as-is; UNAVAILABLE (not faked)
//     until the x402scan call-count surface is wired (M3-1).
//  2. Route concentration by host — REAL, computed from the catalog.
export function RankSection() {
  const rank = getRank(50);
  const hosts = getHosts();
  const hostCount = getHostCount();
  const totalRoutes = hosts.reduce((s, h) => s + h.count, 0);

  return (
    <section className="space-y-4">
      <div className="space-y-0.5">
        <h2 className="text-xl font-semibold tracking-tight">Active endpoints</h2>
        <p className="text-xs text-muted">
          Most-called on x402scan — the numbers are x402scan&apos;s, re-listed
          here as-is (not re-measured, not reordered).
        </p>
      </div>

      {rank.status === "ok" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.4fr)_7rem] gap-x-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
            <span>#</span>
            <span>Name</span>
            <span>Host</span>
            <span className="text-right">{rank.metric ?? "calls"}</span>
          </div>
          {rank.rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 border-b border-border px-3 py-2 text-sm md:grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.4fr)_7rem]"
            >
              <span className="tabular-nums text-muted">{r.rank}</span>
              <span className="truncate font-medium">{r.name}</span>
              <span className="hidden truncate text-muted md:block">{r.host}</span>
              <span className="text-right tabular-nums">
                {r.popularity.toLocaleString()}
              </span>
            </div>
          ))}
          <div className="px-3 py-2 text-[11px] text-muted">
            Source: x402scan ({rank.metric}). Re-listed, not re-measured.
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="text-muted">
            Call-count ranking is{" "}
            <span className="font-medium text-black">unavailable</span> — the
            x402scan ranking surface isn&apos;t wired yet, so no endpoint carries
            a call-count signal. We show{" "}
            <span className="font-medium text-black">no stand-in ordering</span>{" "}
            (not catalog, name, or count order) rather than a fake ranking.
          </p>
        </div>
      )}

      {/* Real signal available today: route concentration by host. */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Where routes concentrate</h3>
          <Link href="/hosts" className="text-xs text-accent hover:underline">
            All {hostCount.toLocaleString()} hosts →
          </Link>
        </div>
        <p className="mb-2 text-xs text-muted">
          {totalRoutes.toLocaleString()} routes across{" "}
          {hostCount.toLocaleString()} hosts — these are routes, not services.
        </p>
        <div className="divide-y divide-border">
          {hosts.slice(0, 8).map((h, i) => (
            <div
              key={h.host}
              className="flex items-baseline gap-3 py-1.5 text-sm"
            >
              <span className="w-5 shrink-0 tabular-nums text-muted">{i + 1}</span>
              <Link
                href={`/hosts#${h.host}`}
                className="min-w-0 flex-1 truncate font-medium hover:text-accent"
              >
                {h.host}
              </Link>
              <span className="shrink-0 tabular-nums text-muted">
                {h.count.toLocaleString()} routes
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
