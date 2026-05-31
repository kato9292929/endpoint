import Link from "next/link";
import { EndpointCard } from "./EndpointCard";
import { MAX_LISTING_ITEMS } from "@/lib/constants";
import type { Endpoint } from "@/lib/types";

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
  const shown = endpoints.slice(0, limit);
  const hidden = endpoints.length - shown.length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-xs text-muted hover:text-white">
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((e) => (
              <EndpointCard key={e.id} endpoint={e} />
            ))}
          </div>
          {hidden > 0 ? (
            <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              Showing the first {shown.length.toLocaleString()} of{" "}
              {endpoints.length.toLocaleString()}.{" "}
              <Link href="/for-agents" className="text-accent hover:underline">
                Use the API
              </Link>{" "}
              or see more in the source directories to reach the remaining{" "}
              {hidden.toLocaleString()}.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
