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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pt-12">
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
    </div>
  );
}
