import { prisma } from "@/lib/db";

/** 이미지 공유 버튼이 있는 도구 */
export const SHARE_TOOLS = {
  equity: "승률 계산기",
  icm: "ICM 계산기",
  "pushfold-pos": "GTO 푸시폴드(포지션)",
  "pushfold-hu": "GTO 푸시폴드(헤즈업)",
  "pushfold-icm": "ICM 푸시폴드",
  "hand-rankings": "족보 순위",
  quiz: "오늘의 퀴즈",
} as const;
export type ShareTool = keyof typeof SHARE_TOOLS;

/** 최근 days일 도구별 공유 수(공유 창 · 저장, 세로형) */
export async function shareStats(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  // 90일 지난 기록은 정리
  await prisma.toolSaved
    .deleteMany({ where: { kind: "share-event", createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } })
    .catch(() => undefined);
  const rows = await prisma.toolSaved
    .groupBy({ by: ["name"], where: { kind: "share-event", createdAt: { gte: since } }, _count: { _all: true } })
    .catch(() => []);
  const out = Object.fromEntries(Object.keys(SHARE_TOOLS).map((k) => [k, { total: 0, shared: 0, downloaded: 0, story: 0 }])) as Record<ShareTool, { total: number; shared: number; downloaded: number; story: number }>;
  for (const r of rows) {
    const [tool, format, result] = r.name.split("|");
    const row = out[tool as ShareTool];
    if (!row) continue;
    row.total += r._count._all;
    if (result === "shared") row.shared += r._count._all;
    else row.downloaded += r._count._all;
    if (format === "story") row.story += r._count._all;
  }
  return out;
}
