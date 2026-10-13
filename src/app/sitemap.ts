import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { JOB_REGIONS } from "@/lib/job-status";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import { sitemapEntries } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

/** 검색 유입 대부분이 구인 공고라 지역별 목록과 공고 상세를 함께 올립니다. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const regions: MetadataRoute.Sitemap = JOB_REGIONS.map((region) => ({
    url: `${base}/jobs/${encodeURIComponent(region)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let jobs: { id: string; updatedAt: Date }[] = [];
  try {
    jobs = await prisma.post.findMany({
      where: {
        boardType: "JOBS",
        hidden: false,
        isAttendanceThread: false,
        createdAt: { gte: since },
        OR: [{ jobKind: null }, { jobKind: { not: "SEEKING" } }],
      },
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

  // 공지·자유·핸드리뷰·TDA 등 누구나 읽는 글(비밀글·익명 후기 제외)
  let posts: { id: string; updatedAt: Date; boardType: string }[] = [];
  try {
    posts = await prisma.post.findMany({
      where: {
        boardType: { in: ["NOTICE", "FREE", "HAND_REVIEW", "TDA", "SCHEDULE", "OFFICIAL_POSTER", "SKETCH", "RULE_QA"] },
        hidden: false,
        isPrivate: false,
        isAttendanceThread: false,
        createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { id: true, updatedAt: true, boardType: true },
    });
  } catch {
    posts = [];
  }
  const boardPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${base}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: post.boardType === "NOTICE" || post.boardType === "TDA" ? 0.6 : 0.5,
  }));
  const guides: MetadataRoute.Sitemap = GUIDE_ARTICLES.map((row) => ({
    url: `${base}/info/guide/${row.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...sitemapEntries(), ...guides, ...regions, ...jobPosts, ...boardPosts];
}
