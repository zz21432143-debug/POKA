import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { feedWhere, isJobFeed, PAGE_SIZE, type FeedKey } from "@/lib/feed";
import { closedJobWhere, jobStatus, openJobWhere, regionWhere, type JobRegion } from "@/lib/job-status";
import { todayKstDate } from "@/lib/dates";
import type { PostSummary } from "@/components/posts/post-list";
import type { JobCardData } from "@/components/jobs/job-cards";

const FEED_INCLUDE = { author: { select: AUTHOR_SELECT }, _count: { select: { comments: true } } } as const;

type FeedRow = Awaited<ReturnType<typeof findFeedRows>>[number];

function findFeedRows(args: {
  where: Prisma.PostWhereInput;
  orderBy: Prisma.PostOrderByWithRelationInput[];
  skip: number;
  take: number;
}) {
  return prisma.post.findMany({ ...args, include: FEED_INCLUDE });
}

export function toJobCard(post: FeedRow, now = new Date(), today = todayKstDate()): JobCardData {
  return {
    id: post.id,
    title: post.title,
    isPaid: post.isPaid,
    status: jobStatus(post, now, today),
    createdAt: post.createdAt.toISOString(),
    authorNickname: post.author?.nickname ?? null,
    authorLevel: post.author?.level ?? null,
    author: post.author,
    jobKind: post.jobKind,
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
    jobTravelPayAmount: post.jobTravelPayAmount,
    jobSnacks: post.jobSnacks,
    jobDressCode: post.jobDressCode,
    jobApplyMethod: post.jobApplyMethod,
    jobEndDate: post.jobEndDate,
    jobEvents: post.jobEvents,
    jobDeadline: post.jobDeadline,
    jobHeadcount: post.jobHeadcount,
    jobAlwaysOpen: post.jobAlwaysOpen,
  };
}

export type JobPageOptions = {
  offset?: number;
  limit?: number;
  region?: JobRegion | null;
  openOnly?: boolean;
};

/**
 * 구인구직 목록. 모집중(유료 고정 먼저 → 최신순) 뒤에 마감 공고(최신순)를 이어 붙입니다.
 * offset은 두 묶음을 합친 순서 기준입니다.
 */
export async function loadJobPage(key: FeedKey, options: JobPageOptions = {}) {
  const offset = Math.max(options.offset ?? 0, 0);
  const limit = options.limit ?? PAGE_SIZE;
  const now = new Date();
  const today = todayKstDate();
  const base: Prisma.PostWhereInput = { ...feedWhere(key), ...regionWhere(options.region ?? null) };
  const openWhere: Prisma.PostWhereInput = { AND: [base, openJobWhere(now, today)] };
  const closedWhere: Prisma.PostWhereInput = { AND: [base, closedJobWhere(now, today)] };

  const [openCount, closedCount] = await Promise.all([
    prisma.post.count({ where: openWhere }),
    options.openOnly ? Promise.resolve(0) : prisma.post.count({ where: closedWhere }),
  ]);

  const rows: FeedRow[] = [];
  if (offset < openCount) {
    rows.push(
      ...(await findFeedRows({
        where: openWhere,
        // 모집중: 프리미엄 → 끌어올린(또는 등록한) 시각 순.
        // 대회 딜러는 날짜가 가까운 대회부터 보이게 첫 날짜 순으로 정리합니다(날짜 미정은 뒤로).
        orderBy:
          key === "jobs/tournament"
            ? [{ isPaid: "desc" }, { jobWorkDate: { sort: "asc", nulls: "last" } }, { bumpedAt: "desc" }]
            : [{ isPaid: "desc" }, { bumpedAt: "desc" }],
        skip: offset,
        take: limit,
      })),
    );
  }
  const remaining = limit - rows.length;
  if (!options.openOnly && remaining > 0 && closedCount > 0) {
    rows.push(
      ...(await findFeedRows({
        where: closedWhere,
        orderBy: [{ createdAt: "desc" }],
        skip: Math.max(offset - openCount, 0),
        take: remaining,
      })),
    );
  }

  const total = openCount + closedCount;
  const nextOffset = offset + rows.length < total ? offset + rows.length : null;
  return { total, openCount, nextOffset, jobs: rows.map((row) => toJobCard(row, now, today)) };
}

export async function loadFeedPage(key: FeedKey, offset = 0, limit = PAGE_SIZE) {
  if (isJobFeed(key)) {
    const page = await loadJobPage(key, { offset, limit });
    return { ...page, posts: [] as PostSummary[], gallery: [], events: [] };
  }
  const where = feedWhere(key);
  const [total, rows] = await Promise.all([
    prisma.post.count({ where }),
    findFeedRows({ where, orderBy: [{ createdAt: "desc" }], skip: offset, take: limit }),
  ]);
  const nextOffset = offset + rows.length < total ? offset + rows.length : null;
  const posts: PostSummary[] = rows.map((post) => ({
    id: post.id,
    boardType: post.boardType,
    title: post.title,
    author: post.author,
    upvoteCount: post.upvoteCount,
    createdAt: post.createdAt.toISOString(),
    viewCount: post.viewCount,
    commentCount: post._count.comments,
    ratingManner: post.ratingManner,
    ratingService: post.ratingService,
    ratingFacility: post.ratingFacility,
    ratingAtmosphere: post.ratingAtmosphere,
    isPrivate: post.isPrivate,
  }));
  const gallery = rows.map((post) => ({
    id: post.id,
    title: post.title,
    bannerImageUrl: post.bannerImageUrl,
    promoLocation: post.promoLocation,
    promoTag: post.promoTag,
    content: post.content,
  }));
  const events = rows.map((post) => ({
    id: post.id,
    title: post.title,
    eventDate: post.eventDate,
    eventEndDate: post.eventEndDate,
    eventPrize: post.eventPrize,
    eventLink: post.eventLink,
    content: post.content,
    poster: post.bannerImageUrl,
    promoLocation: post.promoLocation,
    jobLocation: post.jobLocation,
  }));
  return { total, nextOffset, posts, jobs: [] as JobCardData[], gallery, events };
}
