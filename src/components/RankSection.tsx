import Link from "next/link";
import { getRank } from "@/lib/rank";

// Homepage "what's actually active": x402scan most-called ranking — re-listed
// as-is; UNAVAILABLE (not faked) when the artifact couldn't be fetched.
export function RankSection() {
  const rank = getRank(10);

  return (
    <section className="space-y-4">
      <div className="space-y-0.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Active endpoints
          </h2>
          <Link href="/rank" className="text-xs text-accent hover:underline">
            Full ranking →
          </Link>
        </div>
        <p className="text-xs text-muted">
          Most-called on x402scan — numbers are x402scan&apos;s, re-listed as-is
          (not re-measured, not reordered).
        </p>
      </div>

      {rank.status === "ok" ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[2.5rem_minmax(0,2fr)_6rem_6rem_5rem] gap-x-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
            <span>#</span>
            <span>Service</span>
            <span className="text-right">Calls</span>
            <span className="text-right">USDC</span>
            <span className="text-right">Buyers</span>
          </div>
          {rank.rows.map((r) => (
            <div
              key={r.origin}
              className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 border-b border-border px-3 py-2 text-sm md:grid-cols-[2.5rem_minmax(0,2fr)_6rem_6rem_5rem]"
            >
              <span className="tabular-nums text-muted">{r.rank}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted">{r.host}</span>
              </span>
              <span className="text-right tabular-nums">
                {r.tx_count.toLocaleString()}
              </span>
              <span className="hidden text-right tabular-nums md:block">
                ${r.total_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              <span className="hidden text-right tabular-nums md:block">
                {r.unique_buyers.toLocaleString()}
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
            x402scan ranking couldn&apos;t be fetched, so we show{" "}
            <span className="font-medium text-black">no substitute ordering</span>{" "}
            (not catalog, name, route-count, or price order) rather than a fake
            one. <Link href="/rank" className="text-accent hover:underline">Details →</Link>
          </p>
        </div>
      )}
    </section>
  );
}
