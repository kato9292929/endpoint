// x402 Inc.'s own endpoints are featured: gold-styled (EndpointCard) and pinned
// to the top of listings. Kept dependency-free (no catalog import) so it's safe
// to use from client components.
import type { DirectorySource, Endpoint } from "./types";

export const FEATURED_SOURCE: DirectorySource = "x402-inc";

export function isFeatured(e: Endpoint): boolean {
  return e.source.includes(FEATURED_SOURCE);
}

// Stable partition that floats featured endpoints to the front while preserving
// the incoming order within each group.
export function featuredFirst(endpoints: Endpoint[]): Endpoint[] {
  const featured: Endpoint[] = [];
  const rest: Endpoint[] = [];
  for (const e of endpoints) (isFeatured(e) ? featured : rest).push(e);
  return [...featured, ...rest];
}
