import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OpponentCard } from "@/components/games/omok-ai";
import { OmokCreate } from "@/components/games/omok-create";
import { StoneDot } from "@/components/games/omok-board";
import { GameStatsPanel } from "@/components/games/game-stats-panel";
import { getCurrentUser } from "@/lib/current-user";
import { OMOK_OPPONENTS } from "@/lib/omok-lines";
import { gamesOpen, omokLobby } from "@/lib/omok-server";
import { gameRecord, gameStatsVisible, recordLine } from "@/lib/game-stats";

export const metadata: Metadata = {
  title: "요괴 오목",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const END: Record<string, string> = {
  five: "5목",
  resign: "기권",
  timeout: "시간 초과",
  draw: "무승부",
};

/** 요괴 오목 로비(아케이드): 친구 대전 · 요괴 선택 · 대국 중(관전) · 내 전적 · 최근 대국 */
export default async function OmokLobbyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  const [{ live, recent }, mine] = await Promise.all([
    omokLobby(user?.id ?? null),
    user
      ? gameRecord(user.id, "omok").catch(() => null)
      : Promise.resolve(null),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link
        href="/games"
        className="arcade-kr inline-flex min-h-10 items-center text-xs text-[#c9a25c]"
      >
        ← 요괴 게임방
      </Link>

      {/* 타이틀 */}
      <header className="arcade-panel grid justify-items-center gap-2 px-4 py-5 text-center">
        <p className="arcade-px neon-purple text-[10px]">POKA ARCADE</p>
        <h1 className="arcade-px neon-gold text-2xl leading-snug sm:text-3xl">
          YOKAI
          <br />
          OMOK
        </h1>
        <p className="arcade-kr text-lg text-white">요괴 오목</p>
        <p className="text-xs text-zinc-300">
          15×15 · 흑 먼저 · 정확히 5개 · 흑은 삼삼 금지(✕)
        </p>
        <p className="arcade-px arcade-blink text-[9px] text-[#ffe08a]">
          INSERT COIN
        </p>
      </header>

      {/* 친구 대전 */}
      <section aria-label="친구 대전" className="arcade-panel grid gap-2 p-4">
        <div className="flex items-baseline gap-2">
          <span className="arcade-px neon-red text-[10px]">2P BATTLE</span>
          <h2 className="arcade-kr text-lg text-white">친구 대전</h2>
        </div>
        <p className="text-sm text-[#d1c7b5]">
          방을 만들고 친구를 부르면 대기실에서 기다려요. 친구가 착석하는 순간
          READY · FIGHT! 한 수 60초 · 물리기는 상대가 들어줘야 돼요.
        </p>
        {user ? (
          <OmokCreate />
        ) : (
          <Link
            href="/login?next=/games/omok"
            className="arcade-btn arcade-kr grid min-h-14 place-items-center bg-gradient-to-b from-[#ff5a5a] to-[#b3122e] text-lg text-white"
          >
            로그인하고 방 만들기
          </Link>
        )}
        {mine ? (
          <p
            data-omok-my-record
            className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 text-sm"
          >
            <span className="arcade-px neon-gold text-[9px]">MY RECORD</span>
            <b className="ml-auto font-black text-[#ffe08a]">
              {recordLine(mine)}
            </b>
            {mine.games ? (
              <span className="text-xs text-zinc-400">승률 {mine.rate}%</span>
            ) : null}
          </p>
        ) : null}
      </section>

      {/* 전적 · 랭킹: 공개 전에는 숨김(GAME_STATS_PUBLIC=1이면 보임) */}
      {gameStatsVisible() ? (
        <GameStatsPanel game="omok" userId={user?.id ?? null} />
      ) : null}

      {/* 요괴 선택 */}
      <section
        aria-label="요괴 AI 대전"
        className="arcade-panel grid gap-3 p-4"
      >
        <div className="flex items-baseline gap-2">
          <span className="arcade-px neon-cyan text-[10px]">1P vs CPU</span>
          <h2 className="arcade-kr text-lg text-white">요괴를 골라 연습</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {OMOK_OPPONENTS.map((o, i) => (
            <OpponentCard
              key={o.species}
              index={i}
              href={`/games/omok/ai?vs=${i}`}
            />
          ))}
        </div>
      </section>

      <section
        aria-label="지금 대국 중"
        data-omok-live
        className="arcade-panel grid gap-2 p-4"
      >
        <div className="flex items-baseline gap-2">
          <span className="arcade-px neon-cyan text-[10px]">LIVE</span>
          <h2 className="arcade-kr text-lg text-white">👀 지금 대국 중</h2>
        </div>
        {live.length ? (
          <ul className="grid gap-1">
            {live.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/games/omok/${g.id}`}
                  className="flex min-h-11 items-center gap-2 rounded-md bg-black/30 px-2 text-sm hover:bg-white/5"
                >
                  <StoneDot color={1} />
                  <b className="min-w-0 truncate text-white">{g.black}</b>
                  <span className="arcade-px text-[8px] text-[#ff6b6b]">
                    VS
                  </span>
                  <StoneDot color={2} />
                  <b className="min-w-0 truncate text-white">{g.white}</b>
                  <span className="ml-auto shrink-0 text-xs text-zinc-400">
                    {g.moves}수 · 관전 ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">지금은 대국 중인 판이 없어요.</p>
        )}
      </section>

      {recent.length ? (
        <section
          aria-label="내 최근 대국"
          className="arcade-panel grid gap-2 p-4"
        >
          <div className="flex items-baseline gap-2">
            <span className="arcade-px neon-gold text-[10px]">HISTORY</span>
            <h2 className="arcade-kr text-lg text-white">내 최근 대국</h2>
          </div>
          <ul className="grid gap-1">
            {recent.map((g) => {
              const opp = g.mine === 1 ? g.white : g.black;
              const res = !g.winner
                ? "DRAW"
                : g.winner === g.mine
                  ? "WIN"
                  : "LOSE";
              return (
                <li key={g.id}>
                  <Link
                    href={`/games/omok/${g.id}`}
                    className="flex min-h-11 items-center gap-2 rounded-md bg-black/30 px-2 text-sm hover:bg-white/5"
                  >
                    <span
                      className={`arcade-px w-12 text-[9px] ${res === "WIN" ? "neon-gold" : res === "LOSE" ? "neon-red" : "neon-cyan"}`}
                    >
                      {res}
                    </span>
                    <span className="min-w-0 truncate text-white">
                      vs {opp}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-400">
                      {END[g.endReason] ?? ""} · {g.moves}수 ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
