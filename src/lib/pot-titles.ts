import { prisma } from "@/lib/db";
import { kindOf, type Difficulty } from "@/lib/practice";
import { SITE_SETTING_ID, ensureSiteSettingsRow } from "@/lib/site-settings";
import { monthStartKst, parseTitleConfig, type TitleConfig, type TitlePeriod } from "@/lib/pot-title-config";

/**
 * 팟 계산 랭킹 · 칭호.
 * 랭킹: 난이도별, 사람마다 최고 기록(맞힌 수 많은 순 → 빠른 순 → 먼저 세운 순). 기간은 칭호 설정을 따름(전체 / 이번 달).
 * 칭호: 설정한 난이도 랭킹 1~3위(제외 회원은 건너뜀). 관리자 페이지에서 켜기/끄기 · 이름 · 난이도 · 기간을 바꿉니다.
 */

export type RankRow = { userId: string; nickname: string; correct: number; durationMs: number; at: string; runs?: number };

let configCache: { at: number; config: TitleConfig } | null = null;

export async function loadTitleConfig(): Promise<TitleConfig> {
  const now = Date.now();
  if (configCache && now - configCache.at < 30_000) return configCache.config;
  const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID }, select: { potTitleJson: true } }).catch(() => null);
  const config = parseTitleConfig(row?.potTitleJson);
  configCache = { at: now, config };
  return config;
}

export async function saveTitleConfig(config: TitleConfig) {
  await ensureSiteSettingsRow();
  await prisma.siteSetting.update({ where: { id: SITE_SETTING_ID }, data: { potTitleJson: JSON.stringify(config) } });
  clearPotTitleCache();
}

/** 난이도 랭킹(사람마다 최고 기록) */
export async function rankingRows(difficulty: Difficulty, period: TitlePeriod, take = 10): Promise<RankRow[]> {
  const runs = await prisma.dealerDrillRun.findMany({
    where: {
      kind: kindOf(difficulty),
      user: { withdrawnAt: null },
      ...(period === "month" ? { createdAt: { gte: monthStartKst() } } : {}),
    },
    orderBy: [{ correct: "desc" }, { durationMs: "asc" }, { createdAt: "asc" }],
    take: 600,
    select: { userId: true, correct: true, durationMs: true, createdAt: true, user: { select: { nickname: true } } },
  });
  const rows: RankRow[] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    if (seen.has(run.userId)) continue;
    seen.add(run.userId);
    rows.push({ userId: run.userId, nickname: run.user.nickname, correct: run.correct, durationMs: run.durationMs, at: run.createdAt.toISOString() });
    if (rows.length >= take) break;
  }
  return rows;
}

export type PotTitleInfo = {
  enabled: boolean;
  names: TitleConfig["names"];
  difficulty: Difficulty;
  period: TitlePeriod;
  /** 닉네임 → 순위(1·2·3) */
  holders: Record<string, 1 | 2 | 3>;
};

let titleCache: { at: number; info: PotTitleInfo } | null = null;

/** 지금 칭호 받는 사람(설정 기준). 30초 캐시 */
export async function getPotTitleInfo(): Promise<PotTitleInfo> {
  const now = Date.now();
  if (titleCache && now - titleCache.at < 30_000) return titleCache.info;
  const config = await loadTitleConfig();
  const holders: Record<string, 1 | 2 | 3> = {};
  if (config.enabled) {
    const rows = await rankingRows(config.difficulty, config.period, 30);
    let rank = 0;
    for (const row of rows) {
      if (config.excluded.includes(row.userId)) continue;
      rank += 1;
      holders[row.nickname] = rank as 1 | 2 | 3;
      if (rank >= 3) break;
    }
  }
  const info: PotTitleInfo = { enabled: config.enabled, names: config.names, difficulty: config.difficulty, period: config.period, holders };
  titleCache = { at: now, info };
  return info;
}

/** 기록·설정이 바뀌면 바로 반영되게 */
export function clearPotTitleCache() {
  titleCache = null;
  configCache = null;
}
