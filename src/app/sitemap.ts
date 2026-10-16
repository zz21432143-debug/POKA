import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { JOB_REGIONS } from "@/lib/job-status";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import { sitemapEntries } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { latestJobPerAuthor, postIsThin } from "@/lib/seo-quality";

export const revalidate = 3600;

/** 검색 유입 대부분이 구인 공고라 지역별 목록과 공고 상세를 함께 올립니다. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  // 지역 페이지: 지금 모집 중인 공고가 있는 지역만(빈 지역은 「크롤링됨 - 색인 안 됨」이 되어 사이트 평가만 깎음)
  const { openJobsInRegion } = await import("@/lib/job-region-seo");
  const counts = await Promise.all(JOB_REGIONS.map((region) => openJobsInRegion(region)));
  const regions: MetadataRoute.Sitemap = JOB_REGIONS.filter((_, i) => counts[i] > 0).map((region) => ({
    url: `${base}/jobs/${encodeURIComponent(region)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let jobs: { id: string; updatedAt: Date; authorId: string | null; jobKind: string | null }[] = [];
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
      select: { id: true, updatedAt: true, authorId: true, jobKind: true },
    });
  } catch {
    // DB에 못 붙는 빌드·장애 때도 고정 주소는 내보냅니다. 1시간 뒤 다시 채워집니다.
    jobs = [];
  }
  const jobPosts: MetadataRoute.Sitemap = latestJobPerAuthor(jobs).map((post) => ({
    url: `${base}/posts/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // 공지·자유·핸드리뷰·TDA 등 누구나 읽는 글(비밀글·익명 후기 제외)
  let posts: { id: string; updatedAt: Date; boardType: string; title: string; content: string | null }[] = [];
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
      select: { id: true, updatedAt: true, boardType: true, title: true, content: true },
    });
  } catch {
    posts = [];
  }
  const boardPosts: MetadataRoute.Sitemap = posts.filter((post) => !postIsThin(post)).map((post) => ({
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
