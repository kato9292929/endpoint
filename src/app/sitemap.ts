import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getNetworks } from "@/lib/data";
import { CATEGORIES, DIRECTORY_SOURCES } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (path: string) => `${SITE_URL}${path}`;
  const staticPages = ["/", "/about", "/for-agents"].map((p) => ({ url: u(p) }));
  const categories = CATEGORIES.map((c) => ({ url: u(`/category/${c}`) }));
  const sources = DIRECTORY_SOURCES.flatMap((s) => [
    { url: u(`/directory/${s}`) },
    { url: u(`/by/${s}`) },
  ]);
  const networks = getNetworks().map((n) => ({
    url: u(`/network/${n.name.toLowerCase()}`),
  }));
  return [...staticPages, ...categories, ...sources, ...networks];
}
