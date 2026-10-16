import Link from "next/link";
import { MONTH_RANK_REWARD, monthRecord, todayHighlight, type GameKind } from "@/lib/game-stats";
import { playersOnline } from "@/lib/game-watch";
import { GameAlertToggle } from "@/components/quiz/quiz-alert-toggle";

/** 로비 위: 지금 게임방에 있는 사람 수 · 상대 찾기 알림 켜기 */
export async function OnlineNow({ game }: { game: "omok" | "yut" }) {
  const [n, hi] = await Promise.all([playersOnline(game).catch(() => 0), todayHighlight(game).catch(() => null)]);
  return (
    <div data-online-now={n} className="flex flex-wrap items-center gap-2 text-sm font-bold">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[#3ddc97]">
        <span className="size-2 animate-pulse rounded-full bg-[#3ddc97]" aria-hidden />
        {n ? `지금 ${game === "omok" ? "오목" : "윷놀이"} 방에 ${n}명` : "지금 들어오면 첫 번째!"}
      </span>
      {hi ? (
        <span data-today-highlight className="rounded-full bg-black/40 px-3 py-1 text-xs text-[#ffe08a]">
          🔥 오늘 {hi.games}판 · 최장 {hi.longest.moves}{game === "omok" ? "수" : "번 이동"} — {hi.longest.label}
        </span>
      ) : null}
      <span className="ml-auto">
        <GameAlertToggle />
      </span>
    </div>
  );
}

/** 판마다 점수 흐름(작은 선 그래프) */
function Trend({ points }: { points: number[] }) {
  const W = 84;
  const H = 22;
  const max = Math.max(1, ...points);
  const step = W / Math.max(1, points.length - 1);
  const d = points.map((v, i) => `${(i * step).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  return (
    <svg data-month-trend width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label={`점수 흐름 · 최근 ${points.length}판`} className="shrink-0">
      <polyline points={d} fill="none" stroke="#ffcf4a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(points.length - 1) * step} cy={H - 2 - (last / max) * (H - 4)} r="2.6" fill={last >= prev ? "#3ddc97" : "#ff6b6b"} />
    </svg>
  );
}

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
      {r.trend.length >= 2 ? <Trend points={r.trend} /> : null}
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
