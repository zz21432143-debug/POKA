import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { cn } from "cn";
import {
  GAME_LABEL,
  RANK_MIN_GAMES,
  gameRanking,
  gameRecord,
  type GameKind,
} from "@/lib/game-stats";

/** 게임 전적 · 이번 달 랭킹 칸(오목 · 윷놀이 · 체스 공통). 공개 전에는 로비에 안 나옴(gameStatsVisible) */
export async function GameStatsPanel({
  game,
  userId,
}: {
  game: GameKind;
  userId: string | null;
}) {
  const [mine, ranking] = await Promise.all([
    userId ? gameRecord(userId, game) : Promise.resolve(null),
    gameRanking(game, "month", 10),
  ]);
  return (
    <section
      aria-label={`${GAME_LABEL[game]} 전적 · 랭킹`}
      data-game-stats={game}
      className="arcade-panel grid gap-3 p-4"
    >
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-[#f3d9a4]">🏆 {GAME_LABEL[game]} 전적 · 이번 달 랭킹</h2>
        <Link href={`/ranking?tab=game&game=${game}`} className="inline-flex min-h-10 items-center ml-auto text-sm font-bold text-[#ffcf4a]">
          전체 랭킹 ›
        </Link>
      </div>
      {mine ? (
        <dl className="grid grid-cols-4 gap-2 text-center" data-game-record>
          {[
            ["승", mine.wins, "text-[#f5c451]"],
            ["패", mine.losses, "text-rose-300"],
            ["무", mine.draws, "text-zinc-300"],
            ["승률", `${mine.rate}%`, "text-white"],
          ].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-xl bg-black/30 p-2">
              <dt className="text-[11px] text-zinc-400">{label}</dt>
              <dd
                className={cn("text-xl font-black tabular-nums", String(tone))}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {mine && mine.streak >= 2 ? (
        <p className="text-sm font-bold text-[#f5c451]">
          🔥 지금 {mine.streak}연승 중!
        </p>
      ) : null}
      {ranking.length ? (
        <ol className="grid gap-1" data-game-ranking>
          {ranking.map((r) => (
            <li
              key={r.nickname}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm",
                r.rank === 1 && "bg-[#c9a25c]/10",
              )}
            >
              <span className="flex w-8 items-center gap-0.5 font-black text-white tabular-nums">
                {r.rank <= 3 ? (
                  <CrownIcon aria-hidden className="size-3.5 text-[#f5d76e]" />
                ) : null}
                {r.rank}
              </span>
              <b className="min-w-0 flex-1 truncate text-white">{r.nickname}</b>
              <span className="shrink-0 text-xs text-zinc-300 tabular-nums">
                {r.wins}승 {r.losses}패{r.draws ? ` ${r.draws}무` : ""} ·{" "}
                {r.rate}%
              </span>
              <span className="w-12 shrink-0 text-right text-xs font-black text-[#e7c98a] tabular-nums">
                {r.score}점
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-zinc-400">
          이번 달 {RANK_MIN_GAMES}판 이상 둔 사람이 랭킹에 올라요(승 3점 · 무
          1점).
        </p>
      )}
    </section>
  );
}
