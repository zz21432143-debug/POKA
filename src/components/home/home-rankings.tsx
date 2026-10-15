import Link from "next/link";
import { ChevronRightIcon, CrownIcon } from "lucide-react";
import { cn } from "cn";
import { CrownedFrame, PotTitleBadge } from "@/components/honor/crowned-frame";
import { MarkImage } from "@/components/layout/mark-image";
import { auraClassForSrc } from "@/lib/yokai-achievements";
import { getHomeRankings, getWeeklyRiser } from "@/lib/home-rankings";
import { MyHomeRank } from "@/components/home/my-home-rank";

const CROWN = ["text-[#f5d76e]", "text-[#d1d5db]", "text-[#e0a36a]"];

/** 홈: 레벨 · 마크 · 팟 계산 랭킹(PC 5위까지 · 휴대폰 3위까지) */
export async function HomeRankings() {
  const [boards, riser] = await Promise.all([getHomeRankings().catch(() => []), getWeeklyRiser().catch(() => null)]);
  if (boards.length === 0) return null;
  return (
    <section aria-label="랭킹" data-home-rankings className="lounge-card grid gap-2 rounded-[1.35rem] p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-black text-white">랭킹</h2>
        <span className="rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">1~3위 왕관 · 칭호</span>
        <Link href="/ranking" className="ml-auto inline-flex min-h-10 items-center text-xs font-bold text-[#e7c98a]">
          전체 랭킹
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {boards.map((board) => (
          <div key={board.key} data-rank-board={board.key} className="grid content-start gap-1 rounded-xl border border-[#c9a25c]/25 bg-black/30 p-2">
            <Link href={board.href} className="group flex min-h-9 items-center gap-1 px-1">
              <span className="text-sm font-black text-[#e7c98a]">{board.title}</span>
              {board.note ? <span className="truncate text-[11px] text-zinc-400">{board.note}</span> : null}
              <ChevronRightIcon className="ml-auto size-4 shrink-0 text-[#c9a25c] transition group-hover:translate-x-0.5" />
            </Link>
            {board.rows.length === 0 ? (
              <p className="px-1 py-3 text-xs text-zinc-400">아직 기록이 없어요. 첫 1위에 도전해 보세요!</p>
            ) : (
              <ol className="grid gap-0.5">
                {board.rows.map((row) => (
                  <li key={row.nickname} className={cn("flex min-h-10 items-center gap-2 rounded-lg px-1", row.rank > 3 && "max-sm:hidden", row.rank === 1 && "bg-[#c9a25c]/10")}>
                    <span className="flex w-7 shrink-0 items-center justify-center gap-0.5 text-sm font-black text-white tabular-nums">
                      {row.rank <= 3 ? <CrownIcon aria-hidden className={cn("size-3.5", CROWN[row.rank - 1])} /> : null}
                      {row.rank}
                    </span>
                    <CrownedFrame nickname={row.nickname} aura={auraClassForSrc(row.markUrl)}>
                      <MarkImage src={row.markUrl} alt="" size={28} />
                    </CrownedFrame>
                    <Link href={`/u/${encodeURIComponent(row.nickname)}`} className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="truncate text-sm font-bold text-white">{row.nickname}</span>
                      <PotTitleBadge nickname={row.nickname} max={1} className="max-lg:hidden" />
                    </Link>
                    {row.score ? <span className="shrink-0 text-xs font-black text-[#e7c98a] tabular-nums">{row.score}</span> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
      {/* 이번 주 가장 많이 오른 회원 */}
      {riser ? (
        <Link
          href={`/u/${encodeURIComponent(riser.nickname)}`}
          data-weekly-riser
          className="flex min-h-10 flex-wrap items-center gap-x-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-sm"
        >
          <b className="text-orange-300">🔥 이번 주 급상승</b>
          <span className="font-bold text-white">{riser.nickname}</span>
          <span className="text-zinc-300">
            {riser.label} {riser.rank}위 <b className="text-emerald-400">▲{riser.change}</b>
          </span>
        </Link>
      ) : null}
      {/* 로그인했으면 내 순위 한 줄 */}
      <MyHomeRank />
    </section>
  );
}
