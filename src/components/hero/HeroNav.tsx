"use client";

import Link from "next/link";
import { useState } from "react";

type NavLink = { label: string; href: string };

const LINKS: NavLink[] = [
  { label: "Catalog", href: "#catalog" },
  { label: "About", href: "/about" },
  { label: "For Agents", href: "/for-agents" },
  { label: "API", href: "/api/openapi.json" },
];

const CTA = { label: "Get in touch", href: "https://x402jp.com" };

export function HeroNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-[10] flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 text-black">
          <span
            className="font-heading text-[21px] tracking-tight sm:text-[26px]"
          >
            x402 Endpoint
          </span>
          <span
            className="select-none text-[25px] leading-none sm:text-[30px]"
            style={{ letterSpacing: "-0.02em" }}
            aria-hidden
          >
            ✳︎
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center text-[23px] text-black md:flex">
          {LINKS.map((l, i) => (
            <span key={l.href}>
              <HeroLink {...l} />
              {i < LINKS.length - 1 ? <span>, </span> : null}
            </span>
          ))}
        </div>

        {/* Desktop CTA */}
        <a
          href={CTA.href}
          className="hidden text-[23px] text-black underline underline-offset-2 transition-opacity hover:opacity-60 md:inline"
        >
          {CTA.label}
        </a>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col gap-[5px] md:hidden"
        >
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-[9] flex flex-col justify-center gap-8 bg-white/95 px-8 backdrop-blur-sm transition-opacity duration-300 md:hidden"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="text-[32px] font-medium text-black"
          >
            {l.label}
          </a>
        ))}
        <a
          href={CTA.href}
          onClick={() => setOpen(false)}
          className="text-[32px] font-medium text-black underline underline-offset-2"
        >
          {CTA.label}
        </a>
      </div>
    </>
  );
}

function HeroLink({ label, href }: NavLink) {
  const cls = "text-black transition-opacity hover:opacity-60";
  if (href.startsWith("/") && !href.startsWith("/api")) {
    return (
      <Link href={href} className={cls}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {label}
    </a>
  );
}
