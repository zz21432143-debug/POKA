import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameStatsPanel } from "@/components/games/game-stats-panel";
import { loadWinReward } from "@/lib/game-reward";
import { getCurrentUser } from "@/lib/current-user";
import {
  GAME_LABEL,
  MIN_COUNTED_MOVES,
  gameStatsVisible,
  type GameKind,
} from "@/lib/game-stats";

export const metadata: Metadata = {
  title: "게임 전적 미리보기",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** 마스터 전용 미리보기(어디에도 링크 없음): 공개 전 전적 · 랭킹이 어떻게 보이는지 */
export default async function GameStatsPreviewPage() {
  const user = await getCurrentUser().catch(() => null);
  const WIN_REWARD = await loadWinReward();
  if (!user?.isMaster) notFound();
  const games = Object.keys(GAME_LABEL) as GameKind[];
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link
        href="/games"
        className="inline-flex min-h-10 items-center text-xs font-bold text-[#c9a25c]"
      >
        ← 요괴 게임방
      </Link>
      <header className="ink-panel grid gap-1 rounded-2xl p-4 text-sm text-[#d1c7b5]">
        <h1 className="text-lg font-black text-[#f3d9a4]">
          게임 전적 · 랭킹(숨김 · 미리보기)
        </h1>
        <p>
          지금 회원에게 보이나요?{" "}
          <b className="text-white">
            {gameStatsVisible() ? "보임(GAME_STATS_PUBLIC=1)" : "안 보임"}
          </b>{" "}
          · 이긴 보상:{" "}
          <b className="text-white">
            {process.env.GAME_REWARDS === "1"
              ? `켜짐(+${WIN_REWARD.points}P · EXP ${WIN_REWARD.exp})`
              : "꺼짐"}
          </b>
        </p>
        <p className="text-xs text-zinc-400">
          친구 대전만 기록(AI 대전 제외) · 너무 짧은 판은 빼요(오목{" "}
          {MIN_COUNTED_MOVES.omok}수 미만) · 보상은 하루 {WIN_REWARD.perDay}번,
          같은 상대는 하루 {WIN_REWARD.perOpponentPerDay}번까지.
        </p>
      </header>
      {games.map((g) => (
        <GameStatsPanel key={g} game={g} userId={user.id} />
      ))}
    </div>
  );
}
