"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTypewriter } from "./useTypewriter";

const EMAIL = "hello@x402jp.com";

const WHITE_PILLS: { label: string; href: string }[] = [
  { label: "Browse the catalog", href: "#catalog" },
  { label: "For agents · API", href: "/for-agents" },
  { label: "OpenAPI spec", href: "/api/openapi.json" },
  { label: "About the project", href: "/about" },
];

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" />
      <rect x="1.8" y="1.8" width="6.5" height="6.5" rx="1.2" stroke="currentColor" />
    </svg>
  );
}

export function Hero({ count }: { count: number }) {
  const typed = `Glad you stopped by. ${count.toLocaleString()} machine-payable endpoints, aggregated across the x402 ecosystem. Now — what are you building?`;
  const { displayed, done } = useTypewriter(typed);

  const [pillsVisible, setPillsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPillsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  const copy = () => {
    navigator.clipboard?.writeText(EMAIL).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  const pillBase =
    "inline-flex items-center justify-center rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap transition-colors duration-200";

  return (
    <section className="relative flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0">
      <div className="relative z-10 max-w-xl">
        {/* Blurred intro label */}
        <p
          className="pointer-events-none mb-5 select-none sm:mb-6"
          style={{
            fontSize: "clamp(18px, 4vw, 26px)",
            lineHeight: 1.3,
            fontWeight: 400,
            color: "#000",
            filter: "blur(4px)",
          }}
        >
          Hey there — this is x402 Endpoint,
          <br />
          the cross-directory catalog of machine-payable APIs.
        </p>

        {/* Typewriter */}
        <p
          className="mb-5 text-black sm:mb-6"
          style={{
            fontSize: "clamp(18px, 4vw, 26px)",
            lineHeight: 1.35,
            fontWeight: 400,
            minHeight: 54,
          }}
        >
          {displayed}
          {!done ? (
            <span
              className="ml-[2px] inline-block h-[1.1em] w-[2px] bg-black align-middle"
              style={{ animation: "blink 1s step-end infinite" }}
            />
          ) : null}
        </p>

        {/* Action pills */}
        <div
          className="flex flex-wrap gap-y-1"
          style={{
            opacity: pillsVisible ? 1 : 0,
            transform: pillsVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          {WHITE_PILLS.map((p) =>
            p.href.startsWith("#") || p.href.startsWith("/api") ? (
              <a
                key={p.href}
                href={p.href}
                className={`${pillBase} border border-black/10 bg-white text-black hover:bg-black hover:text-white`}
              >
                {p.label}
              </a>
            ) : (
              <Link
                key={p.href}
                href={p.href}
                className={`${pillBase} border border-black/10 bg-white text-black hover:bg-black hover:text-white`}
              >
                {p.label}
              </Link>
            ),
          )}

          {/* Outline pill: copy email */}
          <button
            type="button"
            onClick={copy}
            className={`${pillBase} gap-2 border border-white bg-transparent text-white hover:bg-white hover:text-black sm:gap-3`}
          >
            <span>
              Reach us:{" "}
              <span className="underline underline-offset-1">{EMAIL}</span>
            </span>
            <CopyIcon />
            {copied ? <span className="text-[11px]">copied</span> : null}
          </button>
        </div>
      </div>
    </section>
  );
}
