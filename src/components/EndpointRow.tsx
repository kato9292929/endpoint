import Link from "next/link";
import { hostOf } from "@/lib/hosts";
import { isFeatured } from "@/lib/featured";
import { CATEGORY_LABELS, DIRECTORY_META, type Endpoint } from "@/lib/types";

function priceLabel(e: Endpoint): string {
  if (!e.price) return "—";
  if (e.price.amount === 0) return "Free";
  return `${e.price.amount} ${e.price.currency}`;
}

// One endpoint = one row. Host is first-class (it's "where the calls land").
// Description is not shown; it's on the title attribute. Numeric columns are
// right-aligned with tabular-nums.
export function EndpointRow({ endpoint: e }: { endpoint: Endpoint }) {
  const host = hostOf(e.url);
  const featured = isFeatured(e);

  return (
    <div
      title={e.description || undefined}
      className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 border-b border-border px-2 py-2 text-sm hover:bg-black/[0.02] md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_5.5rem_6rem_minmax(0,1.3fr)]"
    >
      {/* name (+ featured marker, + host on mobile) */}
      <div className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1">
          {featured ? (
            <span className="text-accent" title="x402 Inc.">
              ★
            </span>
          ) : null}
          <span className="truncate font-medium">{e.name}</span>
        </span>
        <a
          href={e.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs text-muted hover:text-black md:hidden"
        >
          {host} ↗
        </a>
      </div>

      {/* price — mobile right column */}
      <div className="text-right tabular-nums md:hidden">{priceLabel(e)}</div>

      {/* host (md) */}
      <a
        href={e.source_url}
        target="_blank"
        rel="noopener noreferrer"
        title={e.url}
        className="hidden truncate text-muted hover:text-black md:block"
      >
        {host}
      </a>

      {/* category (md) */}
      <Link
        href={`/category/${e.category}`}
        className="hidden text-[11px] uppercase tracking-wide text-muted hover:text-black md:block"
      >
        {CATEGORY_LABELS[e.category]}
      </Link>

      {/* price (md) */}
      <div className="hidden text-right tabular-nums md:block">
        {priceLabel(e)}
      </div>

      {/* networks + source (md) */}
      <div className="hidden min-w-0 items-baseline gap-2 text-[11px] text-muted md:flex">
        <span className="truncate">{e.networks.join(", ")}</span>
        <span className="ml-auto shrink-0">
          {e.source.map((s) => DIRECTORY_META[s]?.label ?? s).join(", ")}
        </span>
      </div>
    </div>
  );
}
