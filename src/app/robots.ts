import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
