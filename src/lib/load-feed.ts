import { prisma } from "@/lib/db";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { feedWhere, isJobFeed, PAGE_SIZE, type FeedKey } from "@/lib/feed";
import type { PostSummary } from "@/components/posts/post-list";
import type { JobCardData } from "@/components/jobs/job-cards";

export async function loadFeedPage(key: FeedKey, offset = 0, limit = PAGE_SIZE) {
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
  const nextOffset = offset + rows.length < total ? offset + rows.length : null;
  const posts: PostSummary[] = rows.map((post) => ({
    id: post.id,
    boardType: post.boardType,
    title: post.title,
    author: post.author,
    upvoteCount: post.upvoteCount,
    createdAt: post.createdAt.toISOString(),
    ratingManner: post.ratingManner,
    ratingService: post.ratingService,
    ratingFacility: post.ratingFacility,
    ratingAtmosphere: post.ratingAtmosphere,
  }));
  const jobs: JobCardData[] = rows.map((post) => ({
    id: post.id,
    title: post.title,
    isPaid: post.isPaid,
    authorNickname: post.author?.nickname ?? null,
    authorLevel: post.author?.level ?? null,
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
    jobSnacks: post.jobSnacks,
    jobDressCode: post.jobDressCode,
    jobApplyMethod: post.jobApplyMethod,
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
    poster: post.bannerImageUrl,
    promoLocation: post.promoLocation,
    jobLocation: post.jobLocation,
  }));
  return { total, nextOffset, posts, jobs, gallery, events, rows };
}
