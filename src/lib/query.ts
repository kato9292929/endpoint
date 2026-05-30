// Shared filtering + search over the catalog, used by the REST API routes.
// Kept framework-agnostic (plain functions over Endpoint[]) so the same logic
// backs /api/endpoints and /api/search.

import Fuse from "fuse.js";
import { getEndpoints } from "./data";
import {
  CATEGORIES,
  DIRECTORY_SOURCES,
  type Category,
  type DirectorySource,
  type Endpoint,
} from "./types";

export type EndpointFilters = {
  category?: string | null;
  network?: string | null;
  protocol?: string | null;
  source?: string | null;
};

function isCategory(v: string): v is Category {
  return (CATEGORIES as string[]).includes(v);
}

function isSource(v: string): v is DirectorySource {
  return (DIRECTORY_SOURCES as string[]).includes(v);
}

// Apply the (all-optional, AND-combined) filters. Unknown category/source
// values simply match nothing; network/protocol match case-insensitively.
export function filterEndpoints(filters: EndpointFilters): Endpoint[] {
  let list = getEndpoints();

  if (filters.category) {
    const c = filters.category.toLowerCase();
    list = isCategory(c) ? list.filter((e) => e.category === c) : [];
  }
  if (filters.source) {
    const s = filters.source.toLowerCase();
    list = isSource(s) ? list.filter((e) => e.source.includes(s)) : [];
  }
  if (filters.network) {
    const n = filters.network.toLowerCase();
    list = list.filter((e) => e.networks.some((x) => x.toLowerCase() === n));
  }
  if (filters.protocol) {
    const p = filters.protocol.toLowerCase();
    list = list.filter((e) => e.protocols.some((x) => x.toLowerCase() === p));
  }

  return list;
}

// Fuzzy search by name/description/url/networks/protocols, optionally within a
// pre-filtered set so search and filters compose.
export function searchEndpoints(query: string, base?: Endpoint[]): Endpoint[] {
  const list = base ?? getEndpoints();
  const q = query.trim();
  if (!q) return list;
  const fuse = new Fuse(list, {
    keys: ["name", "description", "url", "networks", "protocols"],
    threshold: 0.35,
    ignoreLocation: true,
  });
  return fuse.search(q).map((r) => r.item);
}
