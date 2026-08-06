"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { EndpointRow } from "./EndpointRow";
import { RowHeader } from "./RowHeader";
import { FeaturedBlock } from "./FeaturedBlock";
import { defaultOrder, isFeatured } from "@/lib/featured";

// Render endpoints a page at a time so the initial payload stays bounded and
// the user pages through in ~100s rather than scrolling one giant list.
const PAGE_SIZE = 100;
import {
  CATEGORY_LABELS,
  DIRECTORY_META,
  type Category,
  type DirectorySource,
  type Endpoint,
} from "@/lib/types";

type Props = {
  endpoints: Endpoint[];
  networks: string[];
  protocols: string[];
};

type Filters = {
  category: Category | "";
  network: string;
  directory: DirectorySource | "";
  protocol: string;
};

const EMPTY: Filters = { category: "", network: "", directory: "", protocol: "" };

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border rounded px-2 py-1.5 text-sm text-black"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CatalogExplorer({ endpoints, networks, protocols }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);

  const fuse = useMemo(
    () =>
      new Fuse(endpoints, {
        keys: ["name", "description", "url", "networks", "protocols"],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [endpoints],
  );

  const results = useMemo(() => {
    let list = query.trim()
      ? fuse.search(query.trim()).map((r) => r.item)
      : endpoints;

    if (filters.category)
      list = list.filter((e) => e.category === filters.category);
    if (filters.network)
      list = list.filter((e) =>
        e.networks.some((n) => n.toLowerCase() === filters.network.toLowerCase()),
      );
    if (filters.directory)
      list = list.filter((e) =>
        e.source.includes(filters.directory as DirectorySource),
      );
    if (filters.protocol)
      list = list.filter((e) => e.protocols.includes(filters.protocol));

    // No featured pinning. Search keeps Fuse relevance; default view uses the
    // popularity/name order (x402 Inc. is disclosed, not boosted — see /about).
    return query.trim() ? list : defaultOrder(list);
  }, [query, filters, fuse, endpoints]);

  // How many to show; grows by PAGE_SIZE. Reset whenever the result set changes.
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, filters]);

  const set = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const active =
    filters.category || filters.network || filters.directory || filters.protocol;

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search endpoints by name, description, URL…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-black placeholder:text-muted"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Select
          label="Category"
          value={filters.category}
          onChange={(v) => set({ category: v as Category | "" })}
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Select
          label="Network"
          value={filters.network}
          onChange={(v) => set({ network: v })}
          options={networks.map((n) => ({ value: n, label: n }))}
        />
        <Select
          label="Directory"
          value={filters.directory}
          onChange={(v) => set({ directory: v as DirectorySource | "" })}
          options={Object.entries(DIRECTORY_META).map(([value, meta]) => ({
            value,
            label: meta.label,
          }))}
        />
        <Select
          label="Protocol"
          value={filters.protocol}
          onChange={(v) => set({ protocol: v })}
          options={protocols.map((p) => ({ value: p, label: p }))}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Showing {Math.min(visible, results.length).toLocaleString()} of{" "}
          {results.length.toLocaleString()}
          {results.length !== endpoints.length
            ? ` (of ${endpoints.length.toLocaleString()})`
            : ""}{" "}
          endpoints
        </span>
        {active ? (
          <button
            onClick={() => setFilters(EMPTY)}
            className="hover:text-black underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <p className="text-muted text-sm py-12 text-center">
          No endpoints match these filters.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-surface">
            <RowHeader />
            {/* Page 1 rows */}
            {results.slice(0, PAGE_SIZE).map((e) => (
              <EndpointRow key={e.id} endpoint={e} />
            ))}
            {/* End of page 1: x402 Inc. disclosed block (only here). Shows all
                matching x402 Inc. endpoints; they also appear in the list above. */}
            <FeaturedBlock endpoints={results.filter(isFeatured)} />
            {/* Loaded-more rows (page 2+) */}
            {results.slice(PAGE_SIZE, visible).map((e) => (
              <EndpointRow key={e.id} endpoint={e} />
            ))}
          </div>
          {results.length > visible ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border border-border bg-surface px-6 py-2 text-sm text-black hover:bg-black/[0.04]"
              >
                Load next{" "}
                {Math.min(PAGE_SIZE, results.length - visible).toLocaleString()}
              </button>
              <span className="text-xs text-muted">
                {(results.length - visible).toLocaleString()} more
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
