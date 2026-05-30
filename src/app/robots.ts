import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The catalog is meant to be read by humans and agents alike — allow
// everything, including the public API and OpenAPI spec.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    host: SITE_URL,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
