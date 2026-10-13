import { prisma } from "@/lib/db";
import { TITLE_DIFFICULTY, kindOf } from "@/lib/practice";

/**
 * 팟 계산 칭호: 가장 어려운 난이도(지옥) 랭킹 1~3위(사람마다 최고 기록, 맞힌 수 많은 순 → 빠른 순).
 * 닉네임 → 순위(1·2·3). 랭킹 화면과 같은 기준이라 랭킹에 보이는 1~3위가 그대로 칭호를 받습니다.
 */
let cache: { at: number; titles: Record<string, 1 | 2 | 3> } | null = null;

export async function getPotTitles(): Promise<Record<string, 1 | 2 | 3>> {
  const now = Date.now();
  if (cache && now - cache.at < 30_000) return cache.titles;
  const runs = await prisma.dealerDrillRun.findMany({
    where: { kind: kindOf(TITLE_DIFFICULTY), user: { withdrawnAt: null } },
    orderBy: [{ correct: "desc" }, { durationMs: "asc" }, { createdAt: "asc" }],
    take: 200,
    select: { userId: true, user: { select: { nickname: true } } },
  });
  const titles: Record<string, 1 | 2 | 3> = {};
  const seen = new Set<string>();
  for (const run of runs) {
    if (seen.has(run.userId)) continue;
    seen.add(run.userId);
    titles[run.user.nickname] = (seen.size as 1 | 2 | 3);
    if (seen.size >= 3) break;
  }
  cache = { at: now, titles };
  return titles;
}

/** 기록이 새로 저장되면 바로 반영되게 */
export function clearPotTitleCache() {
  cache = null;
}
