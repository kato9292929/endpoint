import Link from "next/link";
import {
  CATEGORY_LABELS,
  DIRECTORY_META,
  type Endpoint,
} from "@/lib/types";

function priceLabel(e: Endpoint): string | null {
  if (!e.price) return null;
  if (e.price.amount === 0) return "Free";
  return `${e.price.amount} ${e.price.currency} / ${e.price.unit}`;
}

export function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const price = priceLabel(endpoint);
  const featured = endpoint.source.includes("x402-inc");

  return (
    <div
      className={
        featured
          ? "rounded-lg border border-accent/40 bg-accent/[0.04] ring-1 ring-accent/10 p-4 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md"
          : "rounded-lg border border-border bg-surface p-4 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md"
      }
    >
      {featured ? (
        <span className="inline-flex items-center gap-1 self-start text-[10px] font-semibold uppercase tracking-wide text-accent">
          ★ x402 Inc.
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-tight">{endpoint.name}</h3>
        <Link
          href={`/category/${endpoint.category}`}
          className="shrink-0 text-[11px] uppercase tracking-wide text-muted border border-border rounded px-2 py-0.5 hover:text-black"
        >
          {CATEGORY_LABELS[endpoint.category]}
        </Link>
      </div>

      <p className="text-sm text-muted line-clamp-3">{endpoint.description}</p>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {endpoint.networks.map((n) => (
          <Link
            key={n}
            href={`/network/${n.toLowerCase()}`}
            className="rounded bg-black/[0.05] border border-border px-1.5 py-0.5 hover:text-black"
          >
            {n}
          </Link>
        ))}
        {endpoint.protocols.map((p) => (
          <span
            key={p}
            className="rounded border border-border px-1.5 py-0.5 text-accent"
          >
            {p}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border">
        <span className="text-sm">
          {price ? (
            <span className="text-black">{price}</span>
          ) : (
            <span className="text-muted">price n/a</span>
          )}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          {endpoint.source.map((s) => (
            <Link
              key={s}
              href={`/directory/${s}`}
              className="hover:text-black"
              title={DIRECTORY_META[s]?.label ?? s}
            >
              {DIRECTORY_META[s]?.label ?? s}
            </Link>
          ))}
        </div>
      </div>

      <a
        href={endpoint.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-accent hover:underline"
      >
        View in directory ↗
      </a>
    </div>
  );
}
