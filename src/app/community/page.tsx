import type { Metadata } from "next";
import Link from "next/link";
import { SIDEBAR_NAV } from "@/lib/nav";
import { BoardBottomAd } from "@/components/ads/board-bottom-ad";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { PopularPosts } from "@/components/posts/popular-posts";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "커뮤니티" };
export const revalidate = 300;

/** 최근 핸드리뷰 5개(커뮤니티 첫 화면 읽을거리) */
async function RecentHands() {
  const rows = await prisma.post
    .findMany({
      where: { boardType: "HAND_REVIEW", hidden: false, isPrivate: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, viewCount: true },
    })
    .catch(() => []);
  if (!rows.length) return null;
  return (
    <section aria-label="최근 핸드리뷰" className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#1d1611]/70">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-black text-[#f3d9a4]">🃏 최근 핸드리뷰</h2>
        <Link href="/boards/hand-review" className="inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a] hover:underline">
          전체 보기 ›
        </Link>
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/posts/${r.id}`} className="flex min-h-11 items-center gap-2 px-4 py-2 hover:bg-white/[0.04]">
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#f6efe2]">{r.title}</span>
              <span className="shrink-0 text-xs text-zinc-500 tabular-nums">조회 {r.viewCount.toLocaleString("ko-KR")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CommunityHubPage() {
  const community = SIDEBAR_NAV.find((group) => group.title === "커뮤니티");
  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.community}>커뮤니티</BoardTitle>
        <p className="mt-2">
          자유 게시판부터 핸드리뷰까지, 같은 길을 걷는 사람들과 이야기하세요.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {community?.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="ink-panel touch-target relative z-10 flex min-h-20 flex-col rounded-2xl p-4 hover:bg-[#241c1e]"
            >
              <p className="font-bold text-white">{item.label}</p>
              <p className="mt-1 text-sm text-[#9CA3AF]">{item.hint}</p>
            </Link>
          </li>
        ))}
      </ul>
      {/* 읽을거리: 인기글 · 최근 핸드리뷰(PC는 나란히) */}
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <PopularPosts boardTypes={["FREE", "RULE_QA", "HAND_REVIEW"]} />
        <RecentHands />
      </div>
      <BoardBottomAd />
    </div>
  );
}
