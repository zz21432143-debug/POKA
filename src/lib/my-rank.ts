import { prisma } from "@/lib/db";
import { exactRank, rankExcludedIds, rankScoreLabel } from "@/lib/ranking";
import { loadTitleConfig, rankingRows } from "@/lib/pot-titles";
import { DIFFICULTY } from "@/lib/practice";

/** 내 랭킹 한 줄: 순위(없으면 순위 밖) · 점수 · 보러 가기 */
export type MyRankRow = { key: string; label: string; short: string; rank: number | null; score: string; href: string };
export type MyRanks = { excluded: false; rows: MyRankRow[] } | { excluded: true; reason: "master" | "admin" };

/**
 * 내 랭킹: 모두 정확한 순위(20위 밖도). 기록이 없으면 「기록 없음」.
 * 마스터 · 랭킹 제외 회원은 랭킹에 없으므로 따로 알려 줌.
 */
export async function getMyRanks(user: { id: string; nickname: string; level: number; exp: number; isMaster: boolean }): Promise<MyRanks> {
  if (user.isMaster) return { excluded: true, reason: "master" };
  const excluded = await rankExcludedIds();
  if (excluded.has(user.id)) return { excluded: true, reason: "admin" };

  const config = await loadTitleConfig();
  const [weekExp, marks, attendance, pot, above] = await Promise.all([
    exactRank("level", "week", user.id).catch(() => null),
    exactRank("marks", "all", user.id).catch(() => null),
    exactRank("attendance", "month", user.id).catch(() => null),
    rankingRows(config.difficulty, config.period, 100_000, 50_000).catch(() => []),
    // 레벨(전체) 정확한 순위: 나보다 레벨이 높거나, 같은 레벨에서 경험치가 많은 회원 수 + 1
    prisma.user
      .count({
        where: {
          withdrawnAt: null,
          isMaster: false,
          id: { notIn: [...excluded] },
          OR: [{ level: { gt: user.level } }, { level: user.level, exp: { gt: user.exp } }],
        },
      })
      .catch(() => null),
  ]);
  const potIndex = pot.findIndex((r) => r.userId === user.id);
  const potRow = potIndex >= 0 ? pot[potIndex] : null;
  return {
    excluded: false,
    rows: [
      { key: "level", label: "레벨(전체)", short: "레벨", rank: user.exp > 0 && above != null ? above + 1 : null, score: `Lv.${user.level}`, href: "/ranking?tab=level" },
      { key: "weekExp", label: "이번 주 경험치", short: "주간 경험치", rank: weekExp?.rank ?? null, score: weekExp ? rankScoreLabel("level", weekExp.score, "week") : "-", href: "/ranking?tab=level&period=week" },
      { key: "marks", label: "마크 수집", short: "마크", rank: marks?.rank ?? null, score: marks ? rankScoreLabel("marks", marks.score) : "-", href: "/ranking?tab=marks" },
      { key: "attendance", label: "이번 달 출석", short: "월간 출석", rank: attendance?.rank ?? null, score: attendance ? rankScoreLabel("attendance", attendance.score, "month") : "-", href: "/ranking?tab=attendance&period=month" },
      {
        key: "pot",
        label: `팟 계산(${DIFFICULTY[config.difficulty].label})`,
        short: "팟 계산",
        rank: potIndex >= 0 ? potIndex + 1 : null,
        score: potRow ? `${potRow.correct}문제` : "-",
        href: "/tools/practice",
      },
    ],
  };
}
