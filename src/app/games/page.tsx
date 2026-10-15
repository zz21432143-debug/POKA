import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { gamesOpen } from "@/lib/omok-server";

export const metadata: Metadata = {
  title: "요괴 게임방",
  robots: { index: false, follow: false },
  openGraph: { title: "요괴 게임방 — 윷놀이 · 오목", description: "POKA 요괴 마을의 요괴 게임방: 윷놀이 · 오목 한 판", url: "/games", images: [{ url: "/images/og/yokai-village-og.jpg", width: 1200, height: 630, alt: "요괴 마을 — 요괴 키우기 · POKA 홀덤 커뮤니티" }], },
};
export const dynamic = "force-dynamic";

const GAMES = [
  {
    href: "/games/omok",
    icon: "⚫⚪",
    name: "요괴 오목",
    hint: "요괴 AI · 친구 대전 · 관전",
    ready: true,
  },
  {
    href: "/games/yut",
    icon: "🎲",
    name: "요괴 윷놀이",
    hint: "1:1 ~ 4:4 팀전 · 초대 코드",
    ready: true,
  },
  // 요괴 체스는 완성되면 다시 넣음(준비 중 카드는 덜 만든 사이트처럼 보여서 숨김)
];

/** 요괴 게임방(비공개 기간: 마스터만) */
export default async function GamesPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pt-12">
      <header className="arcade-panel grid justify-items-center gap-2 px-4 py-6 text-center">
        <p className="arcade-px neon-purple text-[10px]">POKA</p>
        <h1 className="arcade-px neon-gold text-2xl leading-snug">
          YOKAI ARCADE
        </h1>
        <p className="arcade-kr text-lg text-white">요괴 게임방</p>
        <p className="text-xs text-zinc-300">
          요괴들과 한 판! 친구와 대전하거나 요괴와 연습해 보세요.
        </p>
        <p className="arcade-px arcade-blink text-[9px] text-[#ffe08a]">
          SELECT GAME
        </p>
      </header>
      <ul className="grid gap-2">
        {GAMES.map((g) =>
          g.ready ? (
            <li key={g.name}>
              <Link
                href={g.href}
                className="arcade-panel flex min-h-20 items-center gap-3 p-4 transition hover:brightness-125"
              >
                <span className="text-3xl" aria-hidden>
                  {g.icon}
                </span>
                <span className="grid">
                  <b className="arcade-kr text-lg text-[#ffe08a]">{g.name}</b>
                  <span className="text-xs text-zinc-300">{g.hint}</span>
                </span>
                <span className="arcade-px neon-red arcade-blink ml-auto text-[9px]">
                  PLAY
                </span>
              </Link>
            </li>
          ) : (
            <li
              key={g.name}
              className="arcade-panel flex min-h-20 items-center gap-3 p-4 opacity-50"
            >
              <span className="text-3xl grayscale" aria-hidden>
                {g.icon}
              </span>
              <span className="grid">
                <b className="text-base font-black text-zinc-300">{g.name}</b>
                <span className="text-xs text-zinc-400">{g.hint}</span>
              </span>
            </li>
          ),
        )}
      </ul>
      {/* 하는 법 한눈에 · 랭킹 · 요괴 마을(PC 빈 공간 채움) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="arcade-panel grid gap-1.5 p-4 text-sm leading-6 text-zinc-200">
          <h2 className="arcade-kr text-base text-[#ffe08a]">⚫ 오목 하는 법</h2>
          <p>가로 · 세로 · 대각선으로 내 돌 5개를 먼저 이으면 승리. 흑은 삼삼 금수가 있어요.</p>
          <p>휴대폰: 자리를 한 번 눌러 고르고, 한 번 더 누르거나 「착수」로 둬요.</p>
        </section>
        <section className="arcade-panel grid gap-1.5 p-4 text-sm leading-6 text-zinc-200">
          <h2 className="arcade-kr text-base text-[#ffe08a]">🎲 윷놀이 하는 법</h2>
          <p>① 윷 던지기 → ② 반짝이는 내 말 고르기 → ③ 노란 칸 누르기. 3개를 업으면 판에 불길!</p>
          <p>출발 모서리 아래 「골인」 칸에 말을 모두 넣으면 승리.</p>
        </section>
        <Link href="/ranking?tab=game" className="arcade-panel flex min-h-16 items-center gap-3 p-4 transition hover:brightness-125">
          <span className="text-2xl" aria-hidden>🏆</span>
          <span className="grid">
            <b className="arcade-kr text-base text-[#ffe08a]">이달의 게임 랭킹</b>
            <span className="text-xs text-zinc-300">1위는 「오목 요괴」 · 「윷놀이 요괴」 칭호</span>
          </span>
        </Link>
        <Link href="/yokai" className="arcade-panel flex min-h-16 items-center gap-3 p-4 transition hover:brightness-125">
          <span className="text-2xl" aria-hidden>🏮</span>
          <span className="grid">
            <b className="arcade-kr text-base text-[#ffe08a]">요괴 마을</b>
            <span className="text-xs text-zinc-300">내 말이 되는 요괴를 키워요</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
