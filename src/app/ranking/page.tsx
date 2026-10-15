import type { Metadata } from "next";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { CrownedFrame, PotTitleBadge } from "@/components/honor/crowned-frame";
import { RankChange } from "@/components/user/rank-change";
import { getWeekSnapshot } from "@/lib/my-rank";
import { getHonorInfo, getPotTitleInfo } from "@/lib/pot-titles";
import { DIFFICULTY } from "@/lib/practice";
import { PERIOD_LABEL } from "@/lib/pot-title-config";
import { MarkImage } from "@/components/layout/mark-image";
import { getCurrentUser } from "@/lib/current-user";
import { auraClassForSrc } from "@/lib/yokai-achievements";
import {
  getRanking,
  parseRankPeriod,
  parseRankTab,
  rankScoreLabel,
  type RankPeriod,
  type RankTab,
} from "@/lib/ranking";
import { cn } from "cn";
import { StudyAd } from "@/components/ads/board-bottom-ad";

export const metadata: Metadata = { title: "랭킹" };

export const dynamic = "force-dynamic";

const TABS: { id: RankTab; label: string }[] = [
  { id: "level", label: "레벨 랭킹" },
  { id: "marks", label: "마크 수집 랭킹" },
  { id: "attendance", label: "출석 랭킹" },
  { id: "quiz", label: "퀴즈 랭킹" },
];

const PERIODS: { id: RankPeriod; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "week", label: "이번 주" },
  { id: "month", label: "이번 달" },
];

const NOTES: Record<RankTab, Record<RankPeriod, string>> = {
  level: {
    all: "레벨이 높은 순입니다. 같은 레벨이면 누적 경험치가 많은 회원이 앞에 섭니다.",
    week: "이번 주 월요일부터 얻은 경험치 순입니다. 같으면 레벨이 높은 회원이 앞에 섭니다. 주간 1위는 사천왕 마크를 받습니다.",
    month: "이번 달 1일부터 얻은 경험치 순입니다. 같으면 레벨이 높은 회원이 앞에 섭니다.",
  },
  marks: {
    all: "보유한 일반 요괴 마크 종수입니다. 업적 마크는 포함하지 않습니다.",
    week: "이번 주에 새로 모은 요괴 마크 종수입니다.",
    month: "이번 달에 새로 모은 요괴 마크 종수입니다.",
  },
  attendance: {
    all: "누적 출석 일수입니다.",
    week: "이번 주 출석 일수입니다.",
    month: "이번 달 출석 일수입니다.",
  },
  quiz: {
    all: "오늘의 퀴즈를 맞힌 문제 수입니다.",
    week: "이번 주 오늘의 퀴즈를 맞힌 문제 수입니다.",
    month: "이번 달 오늘의 퀴즈를 그날 맞힌 문제 수입니다. 1위(3문제 이상)는 「퀴즈 요괴」 칭호를 받아요.",
  },
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; chg?: string }>;
}) {
  const query = await searchParams;
  const tab = parseRankTab(query.tab);
  const period = parseRankPeriod(query.period);
  // 오르내림(▲▼): 전체 레벨 · 마크 랭킹만(주간 · 월간은 매번 새로 시작)
  const showChange = period === "all" && (tab === "level" || tab === "marks");
  // 오르내림 기준: 이번 주 시작(기본) · 이번 달 시작
  const chg = query.chg === "month" ? ("month" as const) : ("week" as const);
  const [rows, viewer, honors, pot, snap] = await Promise.all([
    getRanking(tab, period).catch(() => []),
    getCurrentUser().catch(() => null),
    getHonorInfo().catch(() => null),
    getPotTitleInfo().catch(() => null),
    showChange ? getWeekSnapshot(chg).catch(() => null) : Promise.resolve(null),
  ]);
  const changeOf = (userId: string, rank: number) => {
    if (!snap || (tab !== "level" && tab !== "marks")) return null;
    const before = snap[tab]?.[userId];
    return before == null ? ("new" as const) : before - rank;
  };
  const potOwner = (rank: 1 | 2 | 3) => (pot ? (Object.entries(pot.holders).find(([, r]) => r === rank)?.[0] ?? null) : null);
  // 칭호 안내: 랭킹 칭호 + 팟 계산 칭호(1~3위)
  const titleRows = [
    ...(honors?.defs ?? []).map((d) => {
      const list = honors?.owners[d.key] ?? [];
      return {
        key: d.key,
        label: `${d.icon} ${d.name}`,
        how: d.top === 3 ? d.desc.replace("1위", "1~3위") : d.desc,
        owner: list.length ? list.map((n, i) => (list.length > 1 ? `${i + 1}위 ${n}` : n)).join(" · ") : null,
        pot: false,
      };
    }),
    ...(pot?.enabled
      ? ([1, 2, 3] as const).map((r) => ({
          key: `pot${r}`,
          label: `${["👹", "🪙", "🏮"][r - 1]} ${pot.names[r]}`,
          how: `팟 계산 ${DIFFICULTY[pot.difficulty].label} 랭킹(${PERIOD_LABEL[pot.period]}) ${r}위`,
          owner: potOwner(r),
          pot: true,
        }))
      : []),
  ];

  return (
    <section className="rank-board">
      <header className="yokai-shop-head">
        <div>
          <p className="yokai-shop-kicker">실시간</p>
          <h1>랭킹</h1>
          <p>레벨(경험치)·마크·출석 주간·월간 1위는 프로필 마크에 황금 왕관과 오라가 붙습니다. 1~3위는 왕관으로 구분합니다. 운영자 계정은 랭킹에 들어가지 않아요.</p>
        </div>
      </header>
      {titleRows.length ? (
        <section aria-label="칭호 안내" data-title-guide className="mb-3 grid gap-2 rounded-2xl border border-[#c9a25c]/30 bg-black/30 p-3">
          <h2 className="text-sm font-black text-[#e7c98a]">칭호 {titleRows.length}종 · 1위(팟 계산은 1~3위)가 되면 닉네임 옆에 붙어요</h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {titleRows.map((t) => (
              <li key={t.key} className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-black/40 px-2 py-1">
                <span className={cn("rounded-full border px-1.5 py-px text-[11px] font-black whitespace-nowrap", t.pot ? "border-amber-300 bg-[#7f1d1d] text-amber-100" : "border-sky-300/70 bg-[#1e1b4b] text-sky-100")}>{t.label}</span>
                <span className="text-xs text-zinc-400">{t.how}</span>
                <span className="ml-auto text-xs font-bold text-white">{t.owner ?? "아직 없음"}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="rank-tabs" role="tablist">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={`/ranking?tab=${item.id}&period=${period}`}
            className={cn("rank-tab", tab === item.id && "is-on")}
            role="tab"
            aria-selected={tab === item.id}
          >
            {item.label}
          </Link>
        ))}
        {/* 팟 계산 랭킹은 팟 계산 화면에서(난이도별 기록) */}
        <Link href="/tools/practice" className="rank-tab">
          팟 계산 랭킹 ›
        </Link>
      </div>
      <div className="rank-periods">
        {PERIODS.map((item) => (
          <Link
            key={item.id}
            href={`/ranking?tab=${tab}&period=${item.id}`}
            className={cn("rank-period", period === item.id && "is-on")}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {showChange ? (
        <div data-rank-change-base className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
          ▲▼ 기준
          {(["week", "month"] as const).map((k) => (
            <Link
              key={k}
              href={`/ranking?tab=${tab}&period=all&chg=${k}`}
              className={cn("inline-flex min-h-9 items-center rounded-full border px-3 font-bold", chg === k ? "border-[#c9a25c] bg-[#c9a25c]/20 text-white" : "border-white/15 text-zinc-400")}
            >
              {k === "week" ? "이번 주 시작보다" : "이번 달 시작보다"}
            </Link>
          ))}
        </div>
      ) : null}
      <p className="yokai-note">{NOTES[tab][period]}</p>
      {rows.length === 0 ? (
        <p className="rank-empty">아직 이 구간의 기록이 없습니다.</p>
      ) : (
        <ol className="rank-list">
          {rows.map((row) => (
            <li key={row.nickname} className={cn("rank-row", viewer?.nickname === row.nickname && "is-me")}>
              <span className={cn("rank-place", row.rank <= 3 && "is-top")}>
                {row.rank <= 3 ? (
                  <CrownIcon
                    aria-hidden
                    className={row.rank === 1 ? "text-[#f5d76e]" : row.rank === 2 ? "text-[#d1d5db]" : "text-[#e0a36a]"}
                  />
                ) : null}
                {row.rank}
              </span>
              <CrownedFrame nickname={row.nickname} aura={auraClassForSrc(row.markUrl)}>
                <MarkImage src={row.markUrl} alt="" size={36} />
              </CrownedFrame>
              <Link href={`/u/${encodeURIComponent(row.nickname)}`} className="rank-name">
                <span className="inline-flex flex-wrap items-center gap-1">
                  {row.nickname}
                  <PotTitleBadge nickname={row.nickname} max={3} />
                </span>
                <span className="rank-lv">Lv.{row.level}</span>
              </Link>
              <strong className="rank-score inline-flex items-center gap-1.5">
                {rankScoreLabel(tab, row.score, period)}
                {showChange ? (
                  <RankChange
                    change={changeOf(row.userId, row.rank)}
                    before={tab === "level" || tab === "marks" ? (snap?.[tab]?.[row.userId] ?? null) : null}
                    now={row.rank}
                    base={chg === "month" ? "이번 달 시작" : "이번 주 시작"}
                  />
                ) : null}
              </strong>
            </li>
          ))}
        </ol>
      )}
      {/* 구글 광고(하단): 검색으로 많이 들어오는 공부 도구 · 랭킹 */}
      <StudyAd />
    </section>
  );
}
