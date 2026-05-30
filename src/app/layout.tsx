import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "x402 Endpoint — 6 directories. 1 catalog.",
  description:
    "A cross-directory unified catalog of x402 ecosystem endpoints. Aggregates x402scan, Agentic.Market, Pay.sh, Ampersend, Visa CLI Merchant Registry, and Circle Agent Marketplace.",
  metadataBase: new URL("https://x402endpoint.com"),
  openGraph: {
    title: "x402 Endpoint",
    description: "6 directories. 1 catalog.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <nav className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6 text-sm">
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
        <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
