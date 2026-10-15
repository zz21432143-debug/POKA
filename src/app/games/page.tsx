import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { getCurrentUser } from "@/lib/current-user";
import { gamesOpen } from "@/lib/omok-server";

export const metadata: Metadata = {
  title: "요괴 게임방",
  robots: { index: false, follow: false },
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
  { href: "", icon: "🥌", name: "요괴 알까기", hint: "준비 중", ready: false },
  { href: "", icon: "♟️", name: "요괴 체스", hint: "준비 중", ready: false },
];

/** 요괴 게임방(비공개 기간: 마스터만) */
export default async function GamesPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <header className="board-intro">
        <BoardTitle sticker={BOARD_STICKER.study}>요괴 게임방</BoardTitle>
        <p className="mt-2">
          요괴들과 한 판! 지금은 마스터만 보이는 비공개 테스트예요.
        </p>
      </header>
      <ul className="grid gap-2">
        {GAMES.map((g) =>
          g.ready ? (
            <li key={g.name}>
              <Link
                href={g.href}
                className="lounge-card flex min-h-20 items-center gap-3 rounded-[1.35rem] p-4"
              >
                <span className="text-3xl" aria-hidden>
                  {g.icon}
                </span>
                <span className="grid">
                  <b className="text-base font-black text-[#f3d9a4]">
                    {g.name}
                  </b>
                  <span className="text-xs text-zinc-300">{g.hint}</span>
                </span>
                <span className="ml-auto text-sm font-black text-[#e7c98a]">
                  입장 ›
                </span>
              </Link>
            </li>
          ) : (
            <li
              key={g.name}
              className="flex min-h-20 items-center gap-3 rounded-[1.35rem] border border-white/10 bg-black/30 p-4 opacity-60"
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
