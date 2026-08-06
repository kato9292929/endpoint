"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The dark site nav for inner pages. The homepage renders its own hero nav
// overlaid on the background video, so hide this there.
export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-sm">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-hero">
            <span className="h-1.5 w-1.5 rounded-full bg-hero" />
          </span>
          <span className="metallic">x402 Endpoint</span>
        </Link>
        <div className="flex gap-4 text-muted">
          <Link href="/" className="hover:text-black">
            Catalog
          </Link>
          <Link href="/rank" className="hover:text-black">
            Rank
          </Link>
          <Link href="/hosts" className="hover:text-black">
            Hosts
          </Link>
          <Link href="/about" className="hover:text-black">
            About
          </Link>
          <Link href="/for-agents" className="hover:text-black">
            For Agents
          </Link>
        </div>
      </div>
    </nav>
  );
}
