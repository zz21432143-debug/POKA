import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { JOB_REGIONS } from "@/lib/job-status";
import { sitemapEntries } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

/** 검색 유입 대부분이 구인 공고라 지역별 목록과 공고 상세를 함께 올립니다. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const regions: MetadataRoute.Sitemap = JOB_REGIONS.map((region) => ({
    url: `${base}/boards/jobs?region=${encodeURIComponent(region)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let jobs: { id: string; updatedAt: Date }[] = [];
  try {
    jobs = await prisma.post.findMany({
      where: { boardType: "JOBS", hidden: false, isAttendanceThread: false, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { id: true, updatedAt: true },
    });
  } catch {
    // DB에 못 붙는 빌드·장애 때도 고정 주소는 내보냅니다. 1시간 뒤 다시 채워집니다.
    jobs = [];
  }
  const jobPosts: MetadataRoute.Sitemap = jobs.map((post) => ({
    url: `${base}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...sitemapEntries(), ...regions, ...jobPosts];
}
