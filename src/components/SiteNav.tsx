"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The dark site nav for inner pages. The homepage renders its own hero nav
// overlaid on the background video, so hide this there.
export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <nav className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          x402 Endpoint
        </Link>
        <div className="flex gap-4 text-muted">
          <Link href="/" className="hover:text-white">
            Catalog
          </Link>
          <Link href="/about" className="hover:text-white">
            About
          </Link>
          <Link href="/for-agents" className="hover:text-white">
            For Agents
          </Link>
        </div>
      </div>
    </nav>
  );
}
