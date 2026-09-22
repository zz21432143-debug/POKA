import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingCards } from "@/components/listing/listing-cards";
import { ScheduleCalendar } from "@/components/listing/schedule-calendar";
import { PostList } from "@/components/posts/post-list";
import { PromoGallery } from "@/components/promo/promo-gallery";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { BOARD_DESCRIPTIONS } from "@/lib/boards";
import { getCurrentUser } from "@/lib/current-user";
import { resolveBoardSlug } from "@/lib/nav";
import { canWriteBoard } from "@/lib/permissions";
import { POST_EXP } from "@/lib/rewards";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = resolveBoardSlug(slug);
  if (!board) notFound();
  const viewer = await getCurrentUser().catch(() => null);
  const canWrite = canWriteBoard(viewer, board.boardType);

  const rows = await prisma.post.findMany({
    where: { boardType: board.boardType, isAttendanceThread: false, hidden: false },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { nickname: true, profileMarkImageUrl: true, level: true } } },
  });

  const gallery = "gallery" in board && board.gallery;
  const calendar = "calendar" in board && board.calendar;
  const listing = "listing" in board && board.listing;
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{board.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {BOARD_DESCRIPTIONS[board.boardType]} · 작성 EXP {POST_EXP[board.boardType]}
          </p>
        </div>
        {canWrite ? (
          <Link href={board.writeHref} className={cn(buttonVariants({ size: "touch" }), "inline-flex")}>
            {listing === "hire" ? "공고 등록" : "글쓰기"}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            {"adminOnly" in board && board.adminOnly
              ? "관리자만 작성할 수 있습니다."
              : listing === "hire"
                ? "기업·팀 회원만 등록할 수 있습니다."
                : listing === "talent"
                  ? "개인 회원만 등록할 수 있습니다."
                  : null}
          </p>
        )}
      </header>

      {gallery ? (
        <PromoGallery
          posts={rows.map((post) => ({
            id: post.id,
            title: post.title,
            bannerImageUrl: post.bannerImageUrl,
            promoLocation: post.promoLocation,
            promoTag: post.promoTag,
            content: post.content,
          }))}
        />
      ) : calendar ? (
        <ScheduleCalendar
          year={now.getFullYear()}
          month={now.getMonth()}
          events={rows.map((post) => ({
            id: post.id,
            title: post.title,
            eventDate: post.eventDate,
            promoLocation: post.promoLocation,
            jobLocation: post.jobLocation,
          }))}
        />
      ) : listing ? (
        <ListingCards
          emptyText="등록된 글이 없습니다."
          items={rows.map((post) => ({
            id: post.id,
            title: post.title,
            jobPositions: post.jobPositions,
            jobLocation: post.jobLocation,
            jobWorkType: post.jobWorkType,
            jobPayType: post.jobPayType,
            jobPayAmount: post.jobPayAmount,
            jobAlwaysOpen: post.jobAlwaysOpen,
            jobWorkDate: post.jobWorkDate,
            jobFilled: post.jobFilled,
            authorNickname: post.author?.nickname ?? null,
          }))}
        />
      ) : (
        <PostList
          posts={rows.map((post) => ({
            id: post.id,
            boardType: post.boardType,
            title: post.title,
            author: post.author,
            upvoteCount: post.upvoteCount,
            createdAt: post.createdAt.toISOString(),
          }))}
          emptyText="이 게시판에 글이 없습니다."
        />
      )}
    </div>
  );
}
