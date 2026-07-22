"use client";

const INTER = { fontFamily: "var(--font-hero)" } as const;
const EASE = "cubic-bezier(0.22,1,0.36,1)";

type Stat = { value: number; label: string; plus?: boolean };

function fadeUp(i: number): React.CSSProperties {
  return {
    animation: `hero-fade-up 0.6s ${EASE} both`,
    animationDelay: `${i * 0.12}s`,
  };
}

function ArrowUpRight({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const HEADING = ["EVERY", "PAYABLE", "ENDPOINT"];

export function Hero({ stats }: { stats: Stat[] }) {
  return (
    <section
      style={INTER}
      className="relative z-10 flex min-h-[100svh] flex-col overflow-hidden pt-[72px] md:pt-[92px]"
    >
      {/* Stats row (middle) */}
      <div className="flex flex-1 items-center justify-end px-5 py-8 sm:px-8 md:px-12 md:py-0">
        <div className="flex items-start gap-5 sm:gap-8 md:gap-10">
          {stats.map((s, i) => (
            <div key={s.label} className="text-right" style={fadeUp(i + 2)}>
              <div
                className="font-semibold leading-none text-black"
                style={{ fontSize: "clamp(1.5rem, 5vw, 3.5rem)", fontWeight: 600 }}
              >
                {s.plus ? (
                  <span className="text-hero" style={{ fontSize: "0.5em" }}>
                    +
                  </span>
                ) : null}
                {s.value.toLocaleString()}
              </div>
              <div className="mt-1 whitespace-pre-line text-[10px] font-semibold uppercase leading-tight tracking-widest text-black sm:text-xs md:text-sm">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-6 px-5 pb-8 sm:px-8 md:gap-12 md:px-12 md:pb-12">
        {/* Row A: tagline + CTA */}
        <div className="flex items-center justify-between gap-4">
          <p
            className="max-w-[130px] text-[10px] font-semibold uppercase tracking-widest text-black sm:max-w-[160px] sm:text-xs md:max-w-xs md:text-sm"
            style={fadeUp(5)}
          >
            Aggregating every
            <br />
            x402 endpoint
            <br />
            worth listing
          </p>
          <a
            href="#catalog"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold uppercase tracking-wide text-hero sm:text-xl sm:tracking-widest md:text-2xl"
            style={fadeUp(6)}
          >
            Browse the catalog
            <ArrowUpRight size={18} />
          </a>
        </div>

        {/* Row B: description + main heading */}
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          <div
            className="w-[120px] shrink-0 text-left text-[9px] font-semibold uppercase tracking-widest text-black sm:w-[180px] sm:text-xs md:w-[280px] md:text-right md:text-sm"
            style={fadeUp(7)}
          >
            A cross-directory catalog of machine-payable x402 endpoints —
            aggregated, ranked, and searchable.
          </div>

          <h1
            className="text-right font-semibold uppercase text-black"
            style={{ fontSize: "clamp(2rem, 9vw, 9rem)", lineHeight: 0.88, fontWeight: 600 }}
          >
            {HEADING.map((word, i) => (
              <span key={word} className="block overflow-hidden">
                <span
                  className="block"
                  style={{
                    animation: `hero-rise 0.7s ${EASE} both`,
                    animationDelay: `${0.4 + i * 0.14}s`,
                  }}
                >
                  {word}
                </span>
              </span>
            ))}
          </h1>
        </div>
      </div>
    </section>
  );
}
