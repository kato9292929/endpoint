function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-black">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function StatsBar({
  total,
  browsable,
  networks,
  categories,
  directories,
  updated,
}: {
  /** The catalog's real size. */
  total: number;
  /** How many of them this page can search — the bundled subset. */
  browsable?: number;
  networks: number;
  categories: number;
  directories: number;
  updated: string;
}) {
  const capped = browsable != null && browsable < total;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <Stat
        label={capped ? `endpoints (${browsable.toLocaleString()} browsable)` : "endpoints"}
        value={total.toLocaleString()}
      />
      <Stat label="networks" value={networks} />
      <Stat label="categories" value={categories} />
      <Stat label="directories" value={directories} />
      <Stat label="updated" value={updated} />
    </div>
  );
}
