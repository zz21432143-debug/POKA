import { prisma } from "@/lib/db";

/** 채움률 이만큼 아래면 알림(최근 7일 · 노출 기록이 충분한 자리만) */
export const LOW_FILL_RATE = 0.5;
export const LOW_FILL_MIN_SAMPLES = 20;

export const AD_PLACEMENT_LABEL: Record<string, string> = {
  "board-bottom": "게시판 · 공부 도구 · 랭킹 하단",
  "post-bottom": "글 아래",
  sidebar: "PC 왼쪽 사이드",
  "home-mid": "홈 중간",
  "home-top": "홈 상단",
  "home-bottom": "홈 하단",
  "post-top": "글 위",
  "post-mid": "긴 글 중간",
  infeed: "목록 사이",
};

/** 최근 7일 채움률이 낮은 자리 */
export async function lowFillPlacements(now: number) {
  const since = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(now - 6 * 86_400_000));
  const rows = await prisma
    .$queryRaw<{ placement: string; filled: number; unfilled: number }[]>`SELECT "placement", SUM("filled")::int AS "filled", SUM("unfilled")::int AS "unfilled" FROM "AdFillStat" WHERE "day" >= ${since} GROUP BY "placement"`
    .catch(() => []);
  return rows
    .filter((r) => r.filled + r.unfilled >= LOW_FILL_MIN_SAMPLES && r.filled / (r.filled + r.unfilled) < LOW_FILL_RATE)
    .map((r) => ({ ...r, label: AD_PLACEMENT_LABEL[r.placement] ?? r.placement, rate: Math.round((r.filled / (r.filled + r.unfilled)) * 100) }));
}
