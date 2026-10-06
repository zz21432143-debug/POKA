import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const paths = [
    "/",
    "/community",
    "/boards/free",
    "/boards/sketch",
    "/boards/jobs",
    "/boards/rules",
    "/issues",
    "/boards/hand-review",
    "/attendance",
    "/practice",
    "/info/guide",
    "/boards/schedule",
    "/boards/official",
    "/about",
    "/advertise",
  ];
  return paths.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/" ? "hourly" : "daily",
    priority: path === "/" ? 1 : 0.7,
  }));
}
