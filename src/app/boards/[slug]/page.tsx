import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

export const dynamic = "force-dynamic";

const ALIASES: Record<string, string> = {
  hire: "/boards/jobs/fixed",
  pickup: "/boards/jobs/urgent",
  talent: "/boards/jobs/seek",
  events: "/boards/schedule",
  "store-review": "/community",
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (ALIASES[slug]) redirect(ALIASES[slug]);
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{board.title}</h1>
          <p className="mt-1 text-sm font-medium text-slate-700">
            {BOARD_DESCRIPTIONS[board.boardType]} · 작성 {postRewardLine(board.boardType)}
            {page.total ? ` · ${page.total}개` : ""}
            {" · 목록은 누구나, 본문은 로그인 후"}
          </p>
        </div>
        {canWrite || !("masterOnly" in board && board.masterOnly) ? (
          <Link href={board.writeHref} className={cn(buttonVariants({ size: "touch" }), "inline-flex")}>
            {calendar ? "일정 등록" : gallery ? "홍보 등록" : "글쓰기"}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">마스터만 작성할 수 있습니다.</p>
        )}
      </header>

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
          emptyText="이 게시판에 글이 없습니다."
          nativeSponsor={nativeSponsor}
        />
      )}
    </div>
  );
}
