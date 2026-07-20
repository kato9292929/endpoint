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
        <link
          rel="stylesheet"
          href="https://db.onlinewebfonts.com/c/5ac3fe7c6abd2f62067f266d89671492?family=HelveticaNowDisplay-Medium"
        />
        <link
          rel="stylesheet"
          href="https://db.onlinewebfonts.com/c/1aa3377e489837a26d019bba501e779d?family=HelveticaNowDisplayW01-Rg"
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
