import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpponentCard } from "@/components/games/omok-ai";
import { OmokCodeEntry, OmokCreate } from "@/components/games/omok-create";
import { StoneDot } from "@/components/games/omok-board";
import { GameStatsPanel } from "@/components/games/game-stats-panel";
import { getCurrentUser } from "@/lib/current-user";
import { OMOK_OPPONENTS } from "@/lib/omok-lines";
import { gamesOpen, omokLobby } from "@/lib/omok-server";
import { gameRecord, gameStatsVisible, recordLine } from "@/lib/game-stats";
import { profileYokai } from "@/lib/yokai-server";
import { yokaiImage } from "@/lib/yokai";

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
  "draw-agree": "합의 무승부",
};

/** 요괴 오목 로비: 방 만들기 · 코드로 입장 · 기다리는 방 · 요괴 연습 · 대국 중(관전) · 내 전적 · 최근 대국. 요괴가 없으면 요괴 고르기로 */
export default async function OmokLobbyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  const yk = user ? await profileYokai(user.id).catch(() => null) : null;
  if (user && !yk) redirect("/yokai?next=%2Fgames%2Fomok");
  const [{ waiting, live, recent }, mine] = await Promise.all([
    omokLobby(user?.id ?? null),
    user
      ? gameRecord(user.id, "omok").catch(() => null)
      : Promise.resolve(null),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/games"
        className="font-black inline-flex min-h-10 w-fit items-center text-sm text-[#ffcf4a]"
      >
        ← 요괴 게임방
      </Link>

      {/* 타이틀 */}
      <header className="arcade-panel grid justify-items-center gap-2 px-4 py-6 text-center">
        <p className="arcade-px neon-purple text-xs">POKA ARCADE</p>
        <h1 className="arcade-px neon-gold text-3xl leading-snug sm:text-4xl">
          YOKAI OMOK
        </h1>
        <p className="arcade-kr text-2xl text-white">요괴 오목</p>
        <p className="text-base text-[#d6cdee]">
          15×15 · 흑이 먼저 · 정확히 5개 · 흑은 삼삼 금지
        </p>
      </header>

      {/* 내 요괴 · 친구 대전 */}
      <section aria-label="친구 대전" className="arcade-panel grid gap-4 p-4">
        {yk ? (
          <div className="flex items-center gap-3">
            <span className="hud-portrait size-20 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- 내 대표 요괴 */}
              <img
                src={yokaiImage(yk.species, yk.stage)}
                alt=""
                className="arcade-bob size-full object-contain"
                draggable={false}
              />
            </span>
            <div className="grid min-w-0 gap-1">
              <b className="truncate text-lg font-black text-white">
                {user?.nickname}
              </b>
              <span className="text-sm font-bold text-[#d6cdee]">
                함께하는 요괴 · {yk.name}({yk.stageName})
              </span>
              {mine ? (
                <span
                  data-omok-my-record
                  className="text-base font-black text-[#ffcf4a]"
                >
                  {recordLine(mine)}
                  {mine.games ? (
                    <span className="ml-1.5 text-sm text-[#d6cdee]">
                      승률 {mine.rate}%
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="grid gap-1">
          <h2 className="arcade-kr text-2xl text-white">⚔️ 친구 대전</h2>
          <p className="text-base text-[#d6cdee]">
            방을 만들면 오목판 앞에서 기다려요. 방 코드를 알려 주면 친구가 앉고,
            둘 다 READY를 누르면 시작!
          </p>
        </div>
        {user ? (
          <OmokCreate />
        ) : (
          <Link
            href="/login?next=/games/omok"
            className="arcade-btn btn-main grid min-h-14 place-items-center text-xl"
          >
            로그인하고 방 만들기
          </Link>
        )}
        <div className="border-t border-white/10 pt-3">
          <OmokCodeEntry />
        </div>
      </section>

      {/* 전적 · 랭킹: 공개 전에는 숨김(GAME_STATS_PUBLIC=1이면 보임) */}
      {gameStatsVisible() ? (
        <GameStatsPanel game="omok" userId={user?.id ?? null} />
      ) : null}

      {waiting.length ? (
        <section
          aria-label="기다리는 방"
          data-omok-waiting-list
          className="arcade-panel grid gap-2 p-4"
        >
          <h2 className="arcade-kr text-xl text-white">🏮 기다리는 방</h2>
          <ul className="grid gap-2">
            {waiting.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/games/omok/${g.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-xl bg-black/30 px-3 hover:bg-white/5"
                >
                  <span className="arcade-px text-sm tracking-widest text-[#ffcf4a]">
                    {g.code}
                  </span>
                  <b className="min-w-0 truncate text-base text-white">
                    {g.host}
                  </b>
                  <span className="ml-auto shrink-0 text-sm font-black text-[#3ddc97]">
                    {g.guest ? "2/2 · 관전 ›" : "1/2 · 들어가기 ›"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 요괴 선택 */}
      <section
        aria-label="요괴와 연습 대국"
        className="arcade-panel grid gap-3 p-4"
      >
        <div className="grid gap-1">
          <h2 className="arcade-kr text-xl text-white">👹 요괴와 연습 대국</h2>
          <p className="text-sm text-[#d6cdee]">
            혼자서 요괴 AI와 둬요(전적에는 안 들어가요).
          </p>
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
        <h2 className="arcade-kr text-xl text-white">👀 지금 대국 중</h2>
        {live.length ? (
          <ul className="grid gap-2">
            {live.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/games/omok/${g.id}`}
                  className="flex min-h-14 items-center gap-2 rounded-xl bg-black/30 px-3 text-base hover:bg-white/5"
                >
                  <StoneDot color={1} />
                  <b className="min-w-0 truncate text-white">{g.black}</b>
                  <span className="vs-badge text-[10px]">VS</span>
                  <StoneDot color={2} />
                  <b className="min-w-0 truncate text-white">{g.white}</b>
                  <span className="ml-auto shrink-0 text-sm font-bold text-[#8eeaff]">
                    {g.moves}수 · 관전 ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-[#d6cdee]">
            지금은 대국 중인 판이 없어요.
          </p>
        )}
      </section>

      {recent.length ? (
        <section
          aria-label="내 최근 대국"
          className="arcade-panel grid gap-2 p-4"
        >
          <h2 className="arcade-kr text-xl text-white">📜 내 최근 대국</h2>
          <ul className="grid gap-2">
            {recent.map((g) => {
              const opp = g.mine === 1 ? g.white : g.black;
              const res = !g.winner ? "무" : g.winner === g.mine ? "승" : "패";
              return (
                <li key={g.id}>
                  <Link
                    href={`/games/omok/${g.id}`}
                    className="flex min-h-12 items-center gap-3 rounded-xl bg-black/30 px-3 text-base hover:bg-white/5"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg font-black ${res === "승" ? "bg-[#ffcf4a] text-[#2a1400]" : res === "패" ? "bg-[#ff5d6c] text-white" : "bg-white/20 text-white"}`}
                    >
                      {res}
                    </span>
                    <span className="min-w-0 truncate font-bold text-white">
                      vs {opp}
                    </span>
                    <span className="ml-auto shrink-0 text-sm text-[#d6cdee]">
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
