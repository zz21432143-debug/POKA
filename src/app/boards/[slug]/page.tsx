import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { replaceTo } from "@/lib/history-redirect";
import { ScheduleBoard } from "@/components/listing/schedule-board";
import { PromoGallery } from "@/components/promo/promo-gallery";
import { InfinitePostList } from "@/components/posts/infinite-post-list";
import { buttonVariants } from "@/components/ui/button";
import { BOARD_DESCRIPTIONS } from "@/lib/boards";
import { getCurrentUser } from "@/lib/current-user";
import { FEED_BY_HREF } from "@/lib/feed";
import { loadFeedPage } from "@/lib/load-feed";
import { resolveBoardSlug } from "@/lib/nav";
import { canWriteBoard } from "@/lib/permissions";
import { postRewardLine } from "@/lib/rewards";
import { PAGE_SIZE } from "@/lib/feed";
import { cn } from "cn";
import { getSponsorCreative } from "@/lib/inventory";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";

export const dynamic = "force-dynamic";

const ALIASES: Record<string, string> = {
  hire: "/boards/jobs/fixed",
  pickup: "/boards/jobs/urgent",
  talent: "/boards/jobs",
  events: "/boards/schedule",
  "store-review": "/community",
};

/** 자유게시판 말머리 탭. 질문·현장 스케치는 자유게시판 안에서 함께 봅니다. */
const FREE_TABS = [
  { slug: "free", label: "전체" },
  { slug: "rules", label: "질문" },
  { slug: "sketch", label: "현장 스케치" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const board = resolveBoardSlug(slug);
  if (!board) return { title: "게시판" };
  return { title: board.title, description: BOARD_DESCRIPTIONS[board.boardType] };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (ALIASES[slug]) replaceTo(ALIASES[slug]);
  const board = resolveBoardSlug(slug);
  if (!board) notFound();
  const viewer = await getCurrentUser().catch(() => null);
  const canWrite = canWriteBoard(viewer, board.boardType);
  const canonical = slug === "promo" ? "official" : slug;
  const feedKey = FEED_BY_HREF[`/boards/${canonical}`];
  if (!feedKey) notFound();
  const gallery = "gallery" in board && board.gallery;
  const calendar = "calendar" in board && board.calendar;
  const now = new Date();
  const page = await loadFeedPage(feedKey, 0, calendar || gallery ? 50 : PAGE_SIZE);
  const nativeSponsor = gallery || calendar ? null : await getSponsorCreative("NATIVE").catch(() => null);

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{FREE_TABS.some((tab) => tab.slug === canonical) ? "자유게시판" : board.title}</h1>
          <p className="mt-2">{BOARD_DESCRIPTIONS[board.boardType]}</p>
          {canWrite || !("masterOnly" in board && board.masterOnly) ? (
            <p className="mt-1.5 text-xs text-[#9CA3AF]">글 작성 시 {postRewardLine(board.boardType)}</p>
          ) : null}
        </div>
        {canWrite || !("masterOnly" in board && board.masterOnly) ? (
          <Link
            href={FREE_TABS.some((tab) => tab.slug === canonical) ? "/boards/free/write" : board.writeHref}
            className={cn(buttonVariants({ size: "touch" }), "relative z-10 inline-flex w-full shrink-0 sm:w-auto")}
          >
            {calendar ? "일정 등록" : gallery ? "홍보 등록" : "글쓰기"}
          </Link>
        ) : null}
      </header>

      {FREE_TABS.some((tab) => tab.slug === canonical) ? (
        <nav aria-label="말머리" className="flex gap-1.5">
          {FREE_TABS.map((tab) => (
            <Link
              key={tab.slug}
              href={`/boards/${tab.slug}`}
              aria-current={tab.slug === canonical ? "page" : undefined}
              className={cn(
                "touch-target inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold",
                tab.slug === canonical
                  ? "border-[#c9a25c] bg-[#c9a25c] text-[#1d1611]"
                  : "border-white/15 text-[#E5E7EB] hover:border-[#c9a25c]/60",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {gallery ? (
        <PromoGallery posts={page.gallery} />
      ) : calendar ? (
        <ScheduleBoard year={now.getFullYear()} month={now.getMonth()} events={page.events} />
      ) : (
        <InfinitePostList
          feedKey={feedKey}
          initialItems={page.posts}
          initialTotal={page.total}
          initialNextOffset={page.nextOffset}
          emptyText="아직 이 게시판에 글이 없습니다."
          emptyAction={
            canWrite || !("masterOnly" in board && board.masterOnly)
              ? {
                  href: FREE_TABS.some((tab) => tab.slug === canonical) ? "/boards/free/write" : board.writeHref,
                  label: "첫 글 쓰기",
                }
              : undefined
          }
          showBoard={canonical === "free"}
          nativeSponsor={nativeSponsor}
        />
      )}
      <BoardBottomAd />
    </div>
  );
}
