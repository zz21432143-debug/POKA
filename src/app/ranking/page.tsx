import type { Metadata } from "next";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { CrownedFrame } from "@/components/honor/crowned-frame";
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

export const metadata: Metadata = { title: "랭킹" };

export const dynamic = "force-dynamic";

const TABS: { id: RankTab; label: string }[] = [
  { id: "points", label: "포인트 랭킹" },
  { id: "marks", label: "마크 수집 랭킹" },
  { id: "attendance", label: "출석 랭킹" },
];

const PERIODS: { id: RankPeriod; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "week", label: "이번 주" },
  { id: "month", label: "이번 달" },
];

const NOTES: Record<RankTab, Record<RankPeriod, string>> = {
  points: {
    all: "지금 보유한 포인트 순입니다.",
    week: "이번 주 월요일부터 획득한 포인트입니다.",
    month: "이번 달 1일부터 획득한 포인트입니다.",
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
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  const query = await searchParams;
  const tab = parseRankTab(query.tab);
  const period = parseRankPeriod(query.period);
  const [rows, viewer] = await Promise.all([
    getRanking(tab, period).catch(() => []),
    getCurrentUser().catch(() => null),
  ]);

  return (
    <section className="rank-board">
      <header className="yokai-shop-head">
        <div>
          <p className="yokai-shop-kicker">실시간</p>
          <h1>랭킹</h1>
          <p>주간·월간 1위는 프로필 마크에 황금 왕관과 오라가 붙습니다. 1~3위는 왕관으로 구분합니다.</p>
        </div>
      </header>
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
                {row.nickname}
                <span>Lv.{row.level}</span>
              </Link>
              <strong className="rank-score">{rankScoreLabel(tab, row.score)}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
