import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOARD_STICKER, BoardTitle } from "@/components/brand/oni";
import { OpponentCard } from "@/components/games/omok-ai";
import { OmokCreate } from "@/components/games/omok-create";
import { StoneDot } from "@/components/games/omok-board";
import { getCurrentUser } from "@/lib/current-user";
import { OMOK_OPPONENTS } from "@/lib/omok-lines";
import { gamesOpen, omokLobby } from "@/lib/omok-server";

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

/** 요괴 오목 로비: 친구 대전 방 만들기 · 요괴 AI · 지금 대국 중(관전) · 내 최근 대국 */
export default async function OmokLobbyPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!gamesOpen(user)) notFound();
  const { live, recent } = await omokLobby(user?.id ?? null);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <header className="board-intro">
        <Link
          href="/games"
          className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]"
        >
          ← 요괴 게임방
        </Link>
        <BoardTitle sticker={BOARD_STICKER.study}>요괴 오목</BoardTitle>
        <p className="mt-2">
          15×15 · 흑이 먼저 · 정확히 5개를 이으면 승리 · 흑은 삼삼 금지(판에 ✕로
          표시).
        </p>
      </header>

      <section
        aria-label="친구 대전"
        className="lounge-card grid gap-2 rounded-[1.35rem] p-4"
      >
        <h2 className="text-base font-black text-[#f3d9a4]">친구 대전</h2>
        <p className="text-sm text-[#d1c7b5]">
          방을 만들고 링크를 보내면 친구가 들어오는 순간 시작! 한 수에 60초,
          링크가 있으면 누구나 관전할 수 있어요.
        </p>
        {user ? (
          <OmokCreate />
        ) : (
          <Link
            href="/login?next=/games/omok"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#7a1c22] text-sm font-black text-[#f6efe2]"
          >
            로그인하고 방 만들기
          </Link>
        )}
      </section>

      <section
        aria-label="요괴 AI 대전"
        className="ink-panel grid gap-2 rounded-2xl p-4"
      >
        <h2 className="text-base font-black text-[#f3d9a4]">
          요괴와 연습 대국
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
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
        className="ink-panel grid gap-2 rounded-2xl p-4"
      >
        <h2 className="text-base font-black text-[#f3d9a4]">👀 지금 대국 중</h2>
        {live.length ? (
          <ul className="grid gap-1">
            {live.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/games/omok/${g.id}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-white/5"
                >
                  <StoneDot color={1} />
                  <b className="min-w-0 truncate text-white">{g.black}</b>
                  <span className="text-zinc-500">vs</span>
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
          className="ink-panel grid gap-2 rounded-2xl p-4"
        >
          <h2 className="text-base font-black text-[#f3d9a4]">내 최근 대국</h2>
          <ul className="grid gap-1">
            {recent.map((g) => {
              const opp = g.mine === 1 ? g.white : g.black;
              const res = !g.winner ? "무" : g.winner === g.mine ? "승" : "패";
              return (
                <li key={g.id}>
                  <Link
                    href={`/games/omok/${g.id}`}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-white/5"
                  >
                    <span
                      className={
                        res === "승"
                          ? "font-black text-[#f5c451]"
                          : res === "패"
                            ? "font-black text-rose-300"
                            : "font-black text-zinc-300"
                      }
                    >
                      {res}
                    </span>
                    <span className="min-w-0 truncate text-white">
                      vs {opp}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-zinc-400">
                      {END[g.endReason] ?? ""} · {g.moves}수 · 다시 보기 ›
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
