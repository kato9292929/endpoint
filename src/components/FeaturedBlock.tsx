import { EndpointRow } from "./EndpointRow";
import type { Endpoint } from "@/lib/types";

// x402 Inc.'s own endpoints, shown as a LABELED block at the end of page 1 —
// disclosed as the operator's, never pinned to the top or reordered in the
// ranking. They also still appear in their natural place in the list above.
export function FeaturedBlock({ endpoints }: { endpoints: Endpoint[] }) {
  if (endpoints.length === 0) return null;
  return (
    <div className="border-y border-accent/30 bg-accent/[0.03]">
      <div className="px-2 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-accent">
        ★ Endpoints provided by x402 Inc. (the operator) — disclosed, not
        rank-boosted
      </div>
      {endpoints.map((e) => (
        <EndpointRow key={`featured-${e.id}`} endpoint={e} />
      ))}
    </div>
  );
}
