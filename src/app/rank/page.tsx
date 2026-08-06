import Link from "next/link";
import { getRank } from "@/lib/rank";
import { CATEGORY_LABELS } from "@/lib/types";

export const revalidate = 3600;
export const metadata = { title: "Ranking — x402 Endpoint" };

function usd(n: number): string {
  return n >= 1 ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${n.toFixed(2)}`;
}

// x402scan's most-called origins, re-listed as-is. UNAVAILABLE (no substitute
// order) when the artifact couldn't be fetched.
export default function RankPage() {
  const rank = getRank(50);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-xs text-muted hover:text-black">
          ← Catalog
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Most-called endpoints
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Numbers are x402scan&apos;s — re-listed here as-is, sorted by{" "}
          <span className="text-black">{rank.sorting}</span> over the last{" "}
          <span className="text-black">{rank.timeframe}d</span>. We do not
          re-measure, reorder, or boost our own endpoints (
          <Link href="/about" className="text-accent hover:underline">
            about
          </Link>
          ).
        </p>
      </header>

      {rank.status !== "ok" ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="text-muted">
            Ranking is{" "}
            <span className="font-medium text-black">unavailable</span> — the
            x402scan ranking couldn&apos;t be fetched. We show{" "}
            <span className="font-medium text-black">no substitute order</span>{" "}
            (not catalog, name, route-count, or price order). Meanwhile, see{" "}
            <Link href="/hosts" className="text-accent hover:underline">
              where routes concentrate by host
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[2.5rem_minmax(0,2.2fr)_6rem_7rem_5.5rem_5rem] gap-x-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
            <span>#</span>
            <span>Service</span>
            <span className="text-right">Calls (tx)</span>
            <span className="text-right">USDC settled</span>
            <span className="text-right">Buyers</span>
            <span>Category</span>
          </div>
          {rank.rows.map((r) => (
            <div
              key={r.origin}
              className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 border-b border-border px-3 py-2 text-sm md:grid-cols-[2.5rem_minmax(0,2.2fr)_6rem_7rem_5.5rem_5rem]"
            >
              <span className="tabular-nums text-muted">{r.rank}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted">
                  {r.host}
                  {r.price ? ` · ${r.price.amount} ${r.price.currency}` : ""}
                  {r.networks.length ? ` · ${r.networks.join(", ")}` : ""}
                </span>
              </span>
              <span className="text-right tabular-nums md:col-auto">
                {r.tx_count.toLocaleString()}
              </span>
              <span className="hidden text-right tabular-nums md:block">
                {usd(r.total_amount)}
              </span>
              <span className="hidden text-right tabular-nums md:block">
                {r.unique_buyers.toLocaleString()}
              </span>
              <span className="hidden text-[11px] uppercase tracking-wide text-muted md:block">
                {r.category ? CATEGORY_LABELS[r.category] : "—"}
              </span>
            </div>
          ))}
          <div className="px-3 py-2 text-[11px] text-muted">
            Source of the numbers: x402scan ({rank.metric}). Re-listed, not
            re-measured. Fetched {rank.generated_at.slice(0, 10)}.
          </div>
        </div>
      )}
    </div>
  );
}
