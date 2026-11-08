import {
  liveServices,
  formatFrom,
  monogramHue,
  initials,
  type Service,
} from "@/lib/services";

const SHOWN = 24;

const CATEGORY_LABEL: Record<string, string> = {
  data: "Data",
  intelligence: "Intelligence",
  oracle: "Oracle",
  compliance: "Compliance",
  compute: "Compute",
  search: "Search",
  media: "Media",
  trading: "Trading",
  messaging: "Messaging",
  other: "Other",
};

function Logo({ s }: { s: Service }) {
  if (s.logo) {
    // Plain <img>: these are 16–180px icons fetched from each service's own
    // site, in whatever format it serves (.ico and .svg included), which the
    // image optimiser does not handle and does not need to.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.logo}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain ring-1 ring-border"
      />
    );
  }
  const hue = monogramHue(s.slug);
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ring-1 ring-border"
      style={{
        backgroundColor: `hsl(${hue} 70% 94%)`,
        color: `hsl(${hue} 60% 32%)`,
      }}
    >
      {initials(s.name)}
    </span>
  );
}

function PartyBadge({ party }: { party: "1P" | "3P" }) {
  const first = party === "1P";
  return (
    <span
      title={
        first
          ? "First party — served from a domain this service controls"
          : "Third party — this company's API resold through a payment gateway"
      }
      className={`rounded border px-1 text-[10px] font-medium leading-4 ${
        first
          ? "border-border text-muted"
          : "border-amber-300 bg-amber-50 text-amber-700"
      }`}
    >
      {party}
    </span>
  );
}

function Row({ s }: { s: Service }) {
  const label = s.category ? CATEGORY_LABEL[s.category] ?? s.category : null;
  const sub = s.party === "3P" && s.via.length ? `via ${s.via[0]}` : s.domain;

  return (
    <li className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
      <Logo s={s} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-black">
            {s.name}
          </span>
          <PartyBadge party={s.party} />
        </div>
        <div className="truncate text-xs text-muted">{sub}</div>
      </div>
      <div className="hidden w-24 shrink-0 text-right text-xs text-muted sm:block">
        {label}
      </div>
      <div className="w-28 shrink-0 text-right">
        <div className="text-sm tabular-nums text-black">{formatFrom(s)}</div>
        <div className="text-[11px] text-muted">
          {s.endpoints.toLocaleString()}{" "}
          {s.endpoints === 1 ? "endpoint" : "endpoints"}
        </div>
      </div>
    </li>
  );
}

export async function ServicesSection() {
  const a = await liveServices();
  const shown = a.services.slice(0, SHOWN);
  const rest = a.counts.services - shown.length;

  if (shown.length === 0) return null;

  return (
    <section id="services" className="scroll-mt-6 space-y-4">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Services the market already uses
        </h2>
        <p className="max-w-3xl text-sm text-muted">
          {a.counts.services.toLocaleString()} services, drawn from{" "}
          <span className="text-black">
            {a.scanned.toLocaleString()} indexed endpoints
          </span>
          . A service is listed only when something other than its own say-so
          vouches for it: it is a{" "}
          <span className="text-black">company you can name</span>, it is listed
          in the <span className="text-black">pay.sh directory</span>, or it has{" "}
          <span className="text-black">actually been called</span> — x402scan
          has ranked it among the most-used at least once. Endpoint count is
          not a reason; anyone can deploy ten thousand routes on a domain they
          bought this morning.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex items-baseline justify-between border-b border-border px-3 py-2 text-xs text-muted">
          <span>
            <span className="font-medium text-black">
              {a.counts.first_party}
            </span>{" "}
            first party ·{" "}
            <span className="font-medium text-black">
              {a.counts.third_party}
            </span>{" "}
            via a gateway
          </span>
          <span className="tabular-nums">
            {a.counts.endpoints.toLocaleString()} endpoints
          </span>
        </div>
        <ul>
          {shown.map((s) => (
            <Row key={s.slug} s={s} />
          ))}
        </ul>
        {rest > 0 && (
          <div className="border-t border-border px-3 py-2 text-xs text-muted">
            {rest.toLocaleString()} more below in the full catalog.
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted">
        <span className="font-medium text-black">3P</span> marks a known
        company&apos;s API resold by a payment gateway. It is a real way to
        reach that API and it is{" "}
        <span className="text-black">not the company&apos;s own listing</span> —
        so it is never presented as theirs.
      </p>
    </section>
  );
}
