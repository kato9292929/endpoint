import { CatalogExplorer } from "@/components/CatalogExplorer";
import { StatsBar } from "@/components/StatsBar";
import { TotalSparkline } from "@/components/TotalSparkline";
import { ScrubVideo } from "@/components/hero/ScrubVideo";
import { HeroNav } from "@/components/hero/HeroNav";
import { Hero } from "@/components/hero/Hero";
import {
  getCatalog,
  getCategoryCounts,
  getNetworks,
  getProtocols,
  getSourceCounts,
} from "@/lib/data";

// Rebuild at most once per day; the daily fetch job pushes fresh data.
export const revalidate = 86400;

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";

export default function HomePage() {
  const { endpoints, generated_at } = getCatalog();
  const networks = getNetworks();
  const protocols = getProtocols();
  const categoryCounts = getCategoryCounts();
  const sourceCounts = getSourceCounts();

  const updated = new Date(generated_at);
  const updatedLabel = isNaN(updated.getTime())
    ? "—"
    : updated.toISOString().slice(0, 10);

  return (
    <>
      <ScrubVideo src={HERO_VIDEO} />
      <HeroNav />

      {/* Break out of the layout's max-w-6xl / padding to go full-bleed. */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 -mb-8 w-screen">
        <Hero count={endpoints.length} />

        {/* Catalog on a solid background so it scrolls over the fixed video. */}
        <section id="catalog" className="relative z-[1] bg-bg">
          <div className="mx-auto max-w-6xl space-y-8 px-5 py-16 sm:px-8">
            <header className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">
                The catalog
              </h2>
              <p className="text-sm text-muted/80 max-w-2xl">
                Aggregating x402 directories — and the x402 endpoints that x402
                Inc. contributes to them.
              </p>
              <div className="pt-2">
                <TotalSparkline />
              </div>
            </header>

            <StatsBar
              total={endpoints.length}
              networks={networks.length}
              categories={
                Object.values(categoryCounts).filter((c) => c > 0).length
              }
              directories={Object.keys(sourceCounts).length}
              updated={updatedLabel}
            />

            <CatalogExplorer
              endpoints={endpoints}
              networks={networks.map((n) => n.name)}
              protocols={protocols.map((p) => p.name)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
