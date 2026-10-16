import type { Metadata } from "next";
import Link from "@/components/ui/link";
import { notFound } from "next/navigation";
import { replaceTo } from "@/lib/history-redirect";
import { ScheduleBoard } from "@/components/listing/schedule-board";
import { PromoGallery } from "@/components/promo/promo-gallery";
import { InfinitePostList } from "@/components/posts/infinite-post-list";
import { PinnedPosts } from "@/components/posts/pinned-posts";
import { PopularPosts } from "@/components/posts/popular-posts";
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
import { TdaViewer } from "@/components/tda/tda-viewer";
import { prisma } from "@/lib/db";
import { sortTdaSections } from "@/lib/tda";
import { contentToDocHtml } from "@/lib/doc-sanitize";
import { escapeHtml } from "@/lib/doc-html";
import { formatKstLabel } from "@/lib/dates";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";

/** ISO 시각 → 한국 날짜 YYYY-MM-DD */
function todayKstFrom(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

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
  // 현장 스케치: 글이 없어 탭 숨김(주소는 그대로 · 글이 쌓이면 다시 넣기)
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const board = resolveBoardSlug(slug);
  if (!board) return { title: "게시판" };
  return {
    title: board.title,
    description: BOARD_DESCRIPTIONS[board.boardType],
  };
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
  // TDA 룰은 쪽 넘김 없이 전체를 한 번에 읽는 문서 보기로 보여 줍니다.
  const tda = board.boardType === "TDA";
  const page = await loadFeedPage(
    feedKey,
    0,
    calendar ? 300 : gallery ? 50 : tda ? 1 : PAGE_SIZE,
  );
  const tdaSections = tda
    ? sortTdaSections(
        (
          await prisma.post.findMany({
            where: { boardType: "TDA", hidden: false },
            select: {
              id: true,
              title: true,
              content: true,
              createdAt: true,
              docPdfUrl: true,
            },
            take: 500,
          })
        ).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      ).map((row) => ({
        id: row.id,
        title: row.title,
        // 종이 한 장 = 제목 + 날짜 + 본문(거른 HTML). 비로그인은 본문을 내려보내지 않습니다.
        html:
          `<h1 class="doc-title">${escapeHtml(row.title)}</h1>` +
          `<div class="doc-meta">${formatKstLabel(todayKstFrom(row.createdAt))}</div>` +
          (viewer ? contentToDocHtml(row.content) : ""),
        pdfUrl: viewer ? row.docPdfUrl : null,
      }))
    : [];
  // 대회 상세 내용도 로그인 회원에게만 내려보냅니다.
  const scheduleEvents = viewer
    ? page.events
    : page.events.map((event) => ({ ...event, content: null }));
  const nativeSponsor =
    gallery || calendar
      ? null
      : await getSponsorCreative("NATIVE").catch(() => null);

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <BoardTitle sticker={BOARD_STICKER[canonical]}>
            {FREE_TABS.some((tab) => tab.slug === canonical)
              ? "자유게시판"
              : board.title}
          </BoardTitle>
          <p className="mt-2">{BOARD_DESCRIPTIONS[board.boardType]}</p>
          {canWrite || !("masterOnly" in board && board.masterOnly) ? (
            <p className="mt-1.5 text-xs text-[#9CA3AF]">
              글 작성 시 {postRewardLine(board.boardType)}
            </p>
          ) : null}
        </div>
        {canWrite || !("masterOnly" in board && board.masterOnly) ? (
          <>
            {/* PC · 태블릿: 소개 칸 오른쪽 버튼 */}
            <Link
              href={FREE_TABS.some((tab) => tab.slug === canonical) ? "/boards/free/write" : board.writeHref}
              className={cn(buttonVariants({ size: "touch" }), "relative z-10 hidden shrink-0 sm:inline-flex")}
            >
              {calendar ? "일정 등록" : gallery ? "홍보 등록" : "글쓰기"}
            </Link>
            {/* 휴대폰: 오른쪽 아래 떠 있는 둥근 버튼(아래 메뉴 바로 위) */}
            <Link
              href={
                viewer
                  ? FREE_TABS.some((tab) => tab.slug === canonical) ? "/boards/free/write" : board.writeHref
                  : `/login?next=${encodeURIComponent(FREE_TABS.some((tab) => tab.slug === canonical) ? "/boards/free/write" : board.writeHref)}`
              }
              data-write-fab={viewer ? "write" : "login"}
              aria-label={viewer ? (calendar ? "일정 등록" : gallery ? "홍보 등록" : "글쓰기") : "로그인하고 글쓰기"}
              className="fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 inline-flex h-13 items-center gap-1.5 rounded-full bg-[#9b1c1c] px-5 text-[15px] font-black text-white shadow-[0_6px_18px_rgba(0,0,0,.55)] ring-2 ring-[#ffcf4a]/60 sm:hidden"
            >
              ✏️ {viewer ? (calendar ? "일정 등록" : gallery ? "홍보 등록" : "글쓰기") : "로그인하고 글쓰기"}
            </Link>
          </>
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
                "touch-target inline-flex min-h-10 items-center rounded-full border px-3.5 text-[13px] font-semibold",
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
        <ScheduleBoard
          year={now.getFullYear()}
          month={now.getMonth()}
          events={scheduleEvents}
          loggedIn={Boolean(viewer)}
        />
      ) : tda ? (
        <TdaViewer
          sections={tdaSections}
          loggedIn={Boolean(viewer)}
          canManage={canWrite}
        />
      ) : (
        <>
          <PinnedPosts
            boardTypes={
              canonical === "free"
                ? ["FREE", "RULE_QA", "SKETCH"]
                : [board.boardType]
            }
          />
          {/* 자유 · 핸드리뷰: 좋은 글이 먼저 보이게 인기글 5개 */}
          {canonical === "free" || board.boardType === "FREE" || board.boardType === "HAND_REVIEW" ? (
            <PopularPosts boardTypes={canonical === "free" ? ["FREE", "RULE_QA", "SKETCH"] : [board.boardType]} />
          ) : null}
          <InfinitePostList
            feedKey={feedKey}
            initialItems={page.posts}
            initialTotal={page.total}
            initialNextOffset={page.nextOffset}
            emptyText="아직 이 게시판에 글이 없습니다."
            emptyAction={
              canWrite || !("masterOnly" in board && board.masterOnly)
                ? {
                    href: FREE_TABS.some((tab) => tab.slug === canonical)
                      ? "/boards/free/write"
                      : board.writeHref,
                    label: "첫 글 쓰기",
                  }
                : undefined
            }
            showBoard={canonical === "free"}
            nativeSponsor={nativeSponsor}
          />
        </>
      )}
      <BoardBottomAd />
      {canWrite || !("masterOnly" in board && board.masterOnly) ? <div aria-hidden data-fab-spacer className="h-16 sm:hidden" /> : null}
    </div>
  );
}
