import { CatalogExplorer } from "@/components/CatalogExplorer";
import { StatsBar } from "@/components/StatsBar";
import { TotalSparkline } from "@/components/TotalSparkline";
import { RankSection } from "@/components/RankSection";
import { HeroVideo } from "@/components/hero/HeroVideo";
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

// Swap this to change the hero background (autoplaying, looping, muted).
const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260517_222138_3e3205be-3364-417b-a64a-bfe087acbec4.mp4";

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

  const nonEmptyCategories = Object.values(categoryCounts).filter(
    (c) => c > 0,
  ).length;
  const directoriesCount = Object.keys(sourceCounts).length;

  const heroStats = [
    { value: endpoints.length, label: "ENDPOINTS\nINDEXED", plus: true },
    { value: nonEmptyCategories, label: "CATEGORIES\nTRACKED" },
    { value: directoriesCount, label: "SOURCE\nDIRECTORIES" },
  ];

  return (
    <>
      <HeroVideo src={HERO_VIDEO} />
      <HeroNav />

      {/* Break out of the layout's max-w-6xl / padding to go full-bleed. */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-8 -mb-8 w-screen">
        <Hero stats={heroStats} />

        {/* Catalog on a solid background so it scrolls over the fixed video. */}
        <section id="catalog" className="relative z-[1] bg-bg">
          <div className="mx-auto max-w-6xl space-y-10 px-5 py-16 sm:px-8">
            {/* 1. Heading (one line) */}
            <header>
              <h2 className="text-2xl font-semibold tracking-tight">
                The catalog — what&apos;s live, and where it&apos;s called
              </h2>
            </header>

            {/* 2. Active endpoints (ranking / route concentration) */}
            <RankSection />

            {/* 3. Stats + sparkline */}
            <div className="space-y-3">
              <StatsBar
                total={endpoints.length}
                networks={networks.length}
                categories={
                  Object.values(categoryCounts).filter((c) => c > 0).length
                }
                directories={Object.keys(sourceCounts).length}
                updated={updatedLabel}
              />
              <TotalSparkline />
            </div>

            {/* 4 + 5. Search + filters + full list (rows) */}
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
