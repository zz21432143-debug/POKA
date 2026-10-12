import { NextResponse } from "next/server";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { PAGE_SIZE, feedWhere, isJobFeed, parseFeedKey } from "@/lib/feed";
import { parseJobRegion } from "@/lib/job-status";
import { loadJobPage } from "@/lib/load-feed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = parseFeedKey(url.searchParams.get("key"));
  if (!key) {
    return NextResponse.json({ error: "알 수 없는 게시판 키입니다." }, { status: 400 });
  }
  const limit = Math.min(Number(url.searchParams.get("limit") ?? PAGE_SIZE) || PAGE_SIZE, 50);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);

  if (key === "attendance") {
    const datePost = await prisma.post.findUnique({
      where: { attendanceDate: todayKstDate() },
    });
    if (!datePost) {
      return NextResponse.json({ key, total: 0, offset, items: [], nextOffset: null });
    }
    const where = { postId: datePost.id, isAttendanceCheck: true };
    const [total, rows] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: { author: { select: AUTHOR_SELECT } },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      title: row.content,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      author: row.author,
    }));
    const nextOffset = offset + items.length < total ? offset + items.length : null;
    return NextResponse.json({ key, total, offset, items, nextOffset });
  }

  if (isJobFeed(key)) {
    const page = await loadJobPage(key, {
      offset,
      limit,
      region: parseJobRegion(url.searchParams.get("region")),
      openOnly: url.searchParams.get("open") === "1",
    });
    return NextResponse.json({ key, total: page.total, offset, items: page.jobs, nextOffset: page.nextOffset });
  }

  const where = feedWhere(key);
  const orderBy = [{ createdAt: "desc" as const }];

  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  const items = rows.map((post) => ({
    id: post.id,
    boardType: post.boardType,
    title: post.title,
    // 본문(content)은 목록에 쓰지 않으며, 비로그인에게 본문이 새지 않도록 내려보내지 않습니다.
    isPrivate: post.isPrivate,
    author: post.author,
    upvoteCount: post.upvoteCount,
    createdAt: post.createdAt.toISOString(),
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    ratingManner: post.ratingManner,
    ratingService: post.ratingService,
    ratingFacility: post.ratingFacility,
    ratingAtmosphere: post.ratingAtmosphere,
    bannerImageUrl: post.bannerImageUrl,
    promoLocation: post.promoLocation,
    promoTag: post.promoTag,
    eventDate: post.eventDate,
    eventEndDate: post.eventEndDate,
    eventPrize: post.eventPrize,
  }));

  const nextOffset = offset + items.length < total ? offset + items.length : null;
  return NextResponse.json({ key, total, offset, items, nextOffset });
}
