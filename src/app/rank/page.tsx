import Link from "next/link";
import { getRank } from "@/lib/rank";

export const revalidate = 86400;
export const metadata = { title: "Ranking — x402 Endpoint" };

// The x402scan "most-called" ranking, re-listed as-is. When the call-count
// surface isn't wired, this shows UNAVAILABLE — never a stand-in ordering.
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
          x402scan&apos;s ranking, re-listed here as-is. The numbers are
          x402scan&apos;s — we do not re-measure, reorder, or boost our own
          endpoints. See{" "}
          <Link href="/about" className="text-accent hover:underline">
            About
          </Link>
          .
        </p>
      </header>

      {rank.status !== "ok" ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm">
          <p className="text-muted">
            Ranking is{" "}
            <span className="font-medium text-black">unavailable</span>. No
            endpoint currently carries an x402scan call-count signal (the
            ranking surface isn&apos;t wired yet). We show{" "}
            <span className="font-medium text-black">no substitute order</span>{" "}
            — not catalog, name, or count order. Meanwhile, see{" "}
            <Link href="/hosts" className="text-accent hover:underline">
              where routes concentrate by host
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="hidden grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.4fr)_8rem] gap-x-4 border-b border-border px-3 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
            <span>#</span>
            <span>Name</span>
            <span>Host</span>
            <span className="text-right">{rank.metric ?? "calls"}</span>
          </div>
          {rank.rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 border-b border-border px-3 py-2 text-sm md:grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,1.4fr)_8rem]"
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
            Source of the numbers: x402scan ({rank.metric}). Re-listed, not
            re-measured.
          </div>
        </div>
      )}
    </div>
  );
}
