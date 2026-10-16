import Link from "next/link";
import { MONTH_RANK_REWARD, monthRecord, type GameKind } from "@/lib/game-stats";

/** 게임 로비 위: 이번 달 내 기록(승패 · 랭킹 점수 · 순위 · 월말 보상까지) */
export async function MonthRecordBar({ userId, game }: { userId: string; game: GameKind }) {
  const r = await monthRecord(userId, game).catch(() => null);
  if (!r) return null;
  const reward = r.rank ? MONTH_RANK_REWARD[r.rank - 1] : undefined;
  return (
    <Link
      href={`/ranking?tab=game&game=${game}`}
      data-month-record={`${r.wins}-${r.losses}-${r.score}`}
      className="arcade-panel flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm font-bold text-white"
    >
      <span className="text-[#ffcf4a]">📅 이번 달 내 기록</span>
      <span>
        {r.wins}승 {r.losses}패{r.draws ? ` ${r.draws}무` : ""}
      </span>
      <span className="text-[#ffe08a]">랭킹 {r.score}점</span>
      <span className="ml-auto text-xs text-[#d6cdee]">
        {r.rank
          ? `${r.rank}위${reward ? ` · 이대로면 월말 +${reward}P` : " · 3위 안이면 월말 보상"} →`
          : r.need
            ? `${r.need}판 더 두면 랭킹에 올라요 →`
            : "랭킹 보기 →"}
      </span>
    </Link>
  );
}
