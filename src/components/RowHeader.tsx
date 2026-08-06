// Column header aligned to EndpointRow's md grid. Hidden on mobile.
export function RowHeader() {
  return (
    <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_5.5rem_6rem_minmax(0,1.3fr)] gap-x-4 border-b border-border px-2 py-2 text-[10px] uppercase tracking-wider text-muted md:grid">
      <span>Name</span>
      <span>Host</span>
      <span>Category</span>
      <span className="text-right">Price</span>
      <span>Networks · Source</span>
    </div>
  );
}
