import { prisma } from "@/lib/db";
import { getRanking, rankExcludedIds, rankScoreLabel } from "@/lib/ranking";
import { loadTitleConfig, rankingRows } from "@/lib/pot-titles";
import { DIFFICULTY } from "@/lib/practice";

/** 내 랭킹 한 줄: 순위(없으면 순위 밖) · 점수 · 보러 가기 */
export type MyRankRow = { key: string; label: string; short: string; rank: number | null; score: string; href: string };
export type MyRanks = { excluded: false; rows: MyRankRow[] } | { excluded: true; reason: "master" | "admin" };

/** 랭킹에 보이는 순위 수(이보다 밖이면 「순위 밖」) */
const SHOWN = 20;

/**
 * 내 랭킹: 레벨(전체)은 정확한 순위, 나머지는 랭킹 화면 20위 안이면 순위 · 밖이면 「순위 밖」.
 * 마스터 · 랭킹 제외 회원은 랭킹에 없으므로 따로 알려 줌.
 */
export async function getMyRanks(user: { id: string; nickname: string; level: number; exp: number; isMaster: boolean }): Promise<MyRanks> {
  if (user.isMaster) return { excluded: true, reason: "master" };
  const excluded = await rankExcludedIds();
  if (excluded.has(user.id)) return { excluded: true, reason: "admin" };

  const config = await loadTitleConfig();
  const [weekExp, marks, attendance, pot, above] = await Promise.all([
    getRanking("level", "week").catch(() => []),
    getRanking("marks", "all").catch(() => []),
    getRanking("attendance", "month").catch(() => []),
    rankingRows(config.difficulty, config.period, SHOWN).catch(() => []),
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
  const at = (rows: { nickname: string }[]) => {
    const i = rows.findIndex((r) => r.nickname === user.nickname);
    return i >= 0 ? i + 1 : null;
  };
  const weekRow = weekExp.find((r) => r.nickname === user.nickname);
  const markRow = marks.find((r) => r.nickname === user.nickname);
  const attRow = attendance.find((r) => r.nickname === user.nickname);
  const potRow = pot.find((r) => r.nickname === user.nickname);
  return {
    excluded: false,
    rows: [
      { key: "level", label: "레벨(전체)", short: "레벨", rank: user.exp > 0 && above != null ? above + 1 : null, score: `Lv.${user.level}`, href: "/ranking?tab=level" },
      { key: "weekExp", label: "이번 주 경험치", short: "주간 경험치", rank: at(weekExp), score: weekRow ? rankScoreLabel("level", weekRow.score, "week") : "-", href: "/ranking?tab=level&period=week" },
      { key: "marks", label: "마크 수집", short: "마크", rank: at(marks), score: markRow ? rankScoreLabel("marks", markRow.score) : "-", href: "/ranking?tab=marks" },
      { key: "attendance", label: "이번 달 출석", short: "월간 출석", rank: at(attendance), score: attRow ? rankScoreLabel("attendance", attRow.score, "month") : "-", href: "/ranking?tab=attendance&period=month" },
      {
        key: "pot",
        label: `팟 계산(${DIFFICULTY[config.difficulty].label})`,
        short: "팟 계산",
        rank: at(pot),
        score: potRow ? `${potRow.correct}문제` : "-",
        href: "/tools/practice",
      },
    ],
  };
}
