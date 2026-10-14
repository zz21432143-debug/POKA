import Link from "next/link";
import { cn } from "cn";
import type { MyRanks } from "@/lib/my-rank";

/** 이번 주 시작보다 오르내림: ▲2(초록) · ▼1(빨강) · NEW · 그대로면 「-」 */
export function RankChange({ change }: { change?: number | "new" | null }) {
  if (change == null) return null;
  if (change === "new") return <span data-rank-change="new" className="shrink-0 text-[10px] font-black text-sky-300">NEW</span>;
  if (change === 0) return <span data-rank-change="0" className="shrink-0 text-[10px] font-bold text-zinc-500">-</span>;
  return (
    <span data-rank-change={change} title="이번 주 시작보다" className={cn("shrink-0 text-[10px] font-black tabular-nums", change > 0 ? "text-emerald-400" : "text-rose-400")}>
      {change > 0 ? `▲${change}` : `▼${-change}`}
    </span>
  );
}

/** 내 랭킹 목록(내 정보 · 내정보 창 공통). compact면 두 줄 촘촘하게 */
export function MyRankList({ ranks, compact = false }: { ranks: MyRanks; compact?: boolean }) {
  if (ranks.excluded) {
    return (
      <p data-my-rank-excluded className="rounded-lg bg-black/30 px-2 py-1.5 text-xs text-zinc-400">
        {ranks.reason === "master" ? "운영자 계정은 랭킹에 들어가지 않아요." : "운영 설정으로 이 계정은 랭킹에서 빠져 있어요."}
      </p>
    );
  }
  return (
    <ul data-my-rank className={cn("grid gap-1", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
      {ranks.rows.map((r) => (
        <li key={r.key}>
          <Link
            href={r.href}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-black/30 px-2 hover:bg-black/50",
              compact ? "min-h-9 text-xs" : "min-h-10 text-sm",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-zinc-300">{compact ? r.short : r.label}</span>
            <b className={cn("shrink-0 tabular-nums", r.rank == null ? "font-bold text-zinc-500" : r.rank <= 3 ? "text-[#f5d76e]" : "text-white")}>
              {r.rank == null ? "기록 없음" : `${r.rank}위`}
            </b>
            <RankChange change={r.change} />
            {compact ? null : <span className="shrink-0 text-xs text-zinc-500">{r.score}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
