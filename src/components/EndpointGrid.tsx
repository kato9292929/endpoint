import Link from "next/link";
import { EndpointCard } from "./EndpointCard";
import type { Endpoint } from "@/lib/types";

export function EndpointGrid({
  title,
  subtitle,
  endpoints,
}: {
  title: string;
  subtitle?: string;
  endpoints: Endpoint[];
}) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {endpoints.map((e) => (
            <EndpointCard key={e.id} endpoint={e} />
          ))}
        </div>
      )}
    </div>
  );
}
