import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { JOB_KIND_LABEL } from "@/lib/nav";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const revalidate = 600;

function xml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function summary(content: string | null) {
  const text = (content ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[━─=]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 200 ? `${text.slice(0, 198)}…` : text;
}

/**
 * RSS 2.0: 최근 공개 글 50개(구인 · 공지 · TDA · 대회 일정 · 자유 · 핸드리뷰 등).
 * 네이버 서치어드바이저 「RSS 제출」에 https://pokerwiki.co.kr/rss.xml 을 넣습니다.
 */
export async function GET() {
  const base = siteUrl();
  // DB에 못 붙어도(빌드 · 장애) 빈 목록으로 응답
  const posts = await Promise.resolve()
    .then(() => prisma.post.findMany({
      where: {
        hidden: false,
        isPrivate: false,
        isAttendanceThread: false,
        boardType: { in: ["JOBS", "NOTICE", "TDA", "SCHEDULE", "FREE", "HAND_REVIEW", "RULE_QA", "SKETCH", "OFFICIAL_POSTER"] },
        OR: [{ jobKind: null }, { jobKind: { not: "SEEKING" } }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        boardType: true,
        jobKind: true,
        jobLocation: true,
        jobPayType: true,
        jobPayAmount: true,
        createdAt: true,
      },
    }))
    .catch(() => []);

  const items = posts
    .map((post) => {
      const board = BOARD_LABELS[post.boardType as BoardTypeKey] ?? "게시글";
      const category = post.jobKind ? (JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL] ?? board) : board;
      const description = post.jobKind
        ? [post.jobLocation, post.jobPayType && post.jobPayAmount ? `${post.jobPayType} ${post.jobPayAmount}` : null, "홀덤 딜러 구인"].filter(Boolean).join(" · ")
        : summary(post.content) || post.title;
      const url = `${base}/posts/${post.id}`;
      return [
        "    <item>",
        `      <title>${xml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <category>${xml(category)}</category>`,
        `      <description>${xml(description)}</description>`,
        `      <pubDate>${post.createdAt.toUTCString()}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(SITE_TITLE)}</title>
    <link>${base}</link>
    <description>${xml(SITE_DESCRIPTION)}</description>
    <language>ko</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${(posts[0]?.createdAt ?? new Date(0)).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=600" },
  });
}
