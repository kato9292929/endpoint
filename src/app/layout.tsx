import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { SiteNav } from "@/components/SiteNav";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <SiteNav />
        <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
