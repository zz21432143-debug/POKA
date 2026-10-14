import Link from "next/link";
import { cn } from "cn";
import type { MyRanks } from "@/lib/my-rank";

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
              {r.rank == null ? "순위 밖" : `${r.rank}위`}
            </b>
            {compact ? null : <span className="shrink-0 text-xs text-zinc-500">{r.score}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
