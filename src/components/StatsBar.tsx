function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-white">{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export function StatsBar({
  total,
  networks,
  categories,
  directories,
  updated,
}: {
  total: number;
  networks: number;
  categories: number;
  directories: number;
  updated: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 rounded-lg border border-border bg-surface p-4">
      <Stat label="endpoints" value={total} />
      <Stat label="networks" value={networks} />
      <Stat label="categories" value={categories} />
      <Stat label="directories" value={directories} />
      <Stat label="updated" value={updated} />
    </div>
  );
}
