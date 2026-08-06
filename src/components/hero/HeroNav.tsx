"use client";

import Link from "next/link";
import { useState } from "react";

type NavLink = { label: string; href: string };

const LINKS: NavLink[] = [
  { label: "Catalog", href: "#catalog" },
  { label: "Rank", href: "/rank" },
  { label: "Hosts", href: "/hosts" },
  { label: "About", href: "/about" },
  { label: "API", href: "/api/openapi.json" },
];

const CTA: NavLink = { label: "Browse the catalog", href: "#catalog" };
const INTER = { fontFamily: "var(--font-hero)" } as const;
const EASE = "cubic-bezier(0.22,1,0.36,1)";

function fadeDown(i: number) {
  return {
    animation: `hero-fade-down 0.5s ${EASE} both`,
    animationDelay: `${i * 0.1}s`,
  } as const;
}

function ArrowUpRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" aria-label="x402 Endpoint" className="shrink-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-hero">
        <span className="h-[10px] w-[10px] rounded-full bg-hero" />
      </span>
    </Link>
  );
}

function NavItem({ label, href }: NavLink) {
  const cls =
    "text-[14px] font-semibold uppercase tracking-widest text-black transition-opacity hover:opacity-60";
  if (href.startsWith("/") && !href.startsWith("/api")) {
    return <Link href={href} className={cls}>{label}</Link>;
  }
  return <a href={href} className={cls}>{label}</a>;
}

export function HeroNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        style={INTER}
        className="fixed inset-x-0 top-0 z-[10] flex items-center justify-between px-5 pt-5 sm:px-8 md:px-12 md:pt-6"
      >
        <div style={fadeDown(0)}>
          <Logo />
        </div>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l, i) => (
            <span key={l.href} style={fadeDown(i + 1)}>
              <NavItem {...l} />
            </span>
          ))}
        </div>

        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          style={fadeDown(5)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-full bg-black"
        >
          <span className="h-0.5 w-4 bg-white" />
          <span className="h-0.5 w-4 bg-white" />
          <span className="h-0.5 w-4 bg-white" />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div
        aria-hidden={!open}
        style={{
          ...INTER,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        className="fixed inset-0 z-50 flex flex-col bg-white px-5 pb-8 pt-5 transition-opacity duration-300 sm:px-8 md:px-12 md:pt-6"
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-16 flex flex-col gap-8">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-3xl font-semibold uppercase tracking-widest text-black"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href={CTA.href}
          onClick={() => setOpen(false)}
          className="mt-auto inline-flex items-center gap-2 text-xl font-semibold uppercase tracking-widest text-hero"
        >
          {CTA.label}
          <ArrowUpRight size={22} />
        </a>
      </div>
    </>
  );
}
