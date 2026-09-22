import { NextResponse } from "next/server";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { PAGE_SIZE, feedWhere, isJobFeed, parseFeedKey } from "@/lib/feed";

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

  const where = feedWhere(key);
  const orderBy = isJobFeed(key)
    ? [{ isPaid: "desc" as const }, { createdAt: "desc" as const }]
    : [{ createdAt: "desc" as const }];

  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      include: { author: { select: AUTHOR_SELECT } },
    }),
  ]);

  const items = rows.map((post) => ({
    id: post.id,
    boardType: post.boardType,
    title: post.title,
    content: post.content,
    author: post.author,
    upvoteCount: post.upvoteCount,
    createdAt: post.createdAt.toISOString(),
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
    jobKind: post.jobKind,
    isPaid: post.isPaid,
    authorNickname: post.author?.nickname ?? null,
    authorLevel: post.author?.level ?? null,
    jobLocation: post.jobLocation,
    jobCompanyName: post.jobCompanyName,
    jobPayType: post.jobPayType,
    jobPayAmount: post.jobPayAmount,
    jobSchedule: post.jobSchedule,
    jobWorkHours: post.jobWorkHours,
    jobBenefits: post.jobBenefits,
    jobExperience: post.jobExperience,
    jobWorkDate: post.jobWorkDate,
    jobDateFlexible: post.jobDateFlexible,
    jobGuaranteedHours: post.jobGuaranteedHours,
    jobOvertime: post.jobOvertime,
    jobTravelPay: post.jobTravelPay,
    jobSnacks: post.jobSnacks,
    jobDressCode: post.jobDressCode,
    jobApplyMethod: post.jobApplyMethod,
  }));

  const nextOffset = offset + items.length < total ? offset + items.length : null;
  return NextResponse.json({ key, total, offset, items, nextOffset });
}
