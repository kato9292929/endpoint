import Link from "next/link";
import { EndpointRow } from "./EndpointRow";
import { RowHeader } from "./RowHeader";
import { MAX_LISTING_ITEMS } from "@/lib/constants";
import { defaultOrder } from "@/lib/featured";
import type { Endpoint } from "@/lib/types";

// A titled, row-based listing (category / network / directory / by pages).
export function EndpointGrid({
  title,
  subtitle,
  endpoints,
  limit = MAX_LISTING_ITEMS,
}: {
  title: string;
  subtitle?: string;
  endpoints: Endpoint[];
  limit?: number;
}) {
  const ordered = defaultOrder(endpoints);
  const shown = ordered.slice(0, limit);
  const hidden = ordered.length - shown.length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-xs text-muted hover:text-black">
          ← All endpoints
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted text-sm">{subtitle}</p> : null}
      </header>

      {endpoints.length === 0 ? (
        <p className="text-muted text-sm py-12 text-center">
          No endpoints found here yet.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <RowHeader />
          {shown.map((e) => (
            <EndpointRow key={e.id} endpoint={e} />
          ))}
          {hidden > 0 ? (
            <div className="px-2 py-3 text-xs text-muted">
              Showing the first {shown.length.toLocaleString()} of{" "}
              {endpoints.length.toLocaleString()}.{" "}
              <Link href="/for-agents" className="text-accent hover:underline">
                Use the API
              </Link>{" "}
              to reach the remaining {hidden.toLocaleString()}.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
