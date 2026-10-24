import { prisma } from "@/lib/db";
import { kindOf, type Difficulty } from "@/lib/practice";
import { SITE_SETTING_ID, ensureSiteSettingsRow } from "@/lib/site-settings";
import { HONOR_DEFS, HONOR_KEYS, monthStartKst, parseTitleConfig, type HonorKey, type TitleConfig, type TitlePeriod } from "@/lib/pot-title-config";
import { clearRankingCache, getRanking } from "@/lib/ranking";
import { todayKstDate, weekStartKst } from "@/lib/dates";
import { pushTicker } from "@/lib/ticker";
import { notifyUser } from "@/lib/push";

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
/** scan: 읽을 기록 수(사람마다 최고 기록만 쓰므로 정확한 순위를 볼 때는 크게) */
export async function rankingRows(difficulty: Difficulty, period: TitlePeriod, take = 10, scan = 600): Promise<RankRow[]> {
  const { rankExcluded } = await loadTitleConfig();
  const runs = await prisma.dealerDrillRun.findMany({
    where: {
      kind: kindOf(difficulty),
      // 마스터(운영) 계정 · 관리자가 고른 「랭킹 제외」 회원은 랭킹 · 칭호에서 뺌
      user: { withdrawnAt: null, isMaster: false },
      ...(rankExcluded.length ? { userId: { notIn: rankExcluded } } : {}),
      ...(period === "month" ? { createdAt: { gte: monthStartKst() } } : {}),
    },
    orderBy: [{ correct: "desc" }, { durationMs: "asc" }, { createdAt: "asc" }],
    take: scan,
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

/** 받은 칭호 하나: 어떤 칭호 · 몇 위 */
export type HonorHold = { key: HonorKey; rank: number };

/** 랭킹 칭호(켜진 것만): 이름 · 아이콘 · 설명과 받는 사람 */
export type HonorInfo = {
  defs: { key: HonorKey; icon: string; name: string; desc: string; top: 1 | 3 }[];
  /** 닉네임 → 받은 칭호(순위 포함) */
  holders: Record<string, HonorHold[]>;
  /** 칭호 → 받는 사람(1위부터) */
  owners: Record<HonorKey, string[]>;
  /** 닉네임 → 대표 칭호(본인이 고른 것: 랭킹 칭호 키 또는 "pot") */
  main: Record<string, string>;
};

/** ToolSaved 종류: 대표 칭호(ownerId = 회원 id, name = 칭호 키) */
const KIND_MAIN = "honor-main";

/** 대표 칭호 고르기(빈 값이면 지움) */
export async function setHonorMain(userId: string, key: string) {
  if (!key) {
    await prisma.toolSaved.deleteMany({ where: { ownerId: userId, kind: KIND_MAIN } });
  } else {
    const id = `honormain_${userId}`;
    await prisma.toolSaved.upsert({ where: { id }, create: { id, ownerId: userId, kind: KIND_MAIN, name: key, dataJson: "{}" }, update: { name: key } });
  }
  honorCache = null;
}

let honorCache: { at: number; info: HonorInfo; config: string } | null = null;

/** 랭킹 칭호: 각 랭킹 1위(관리자가 고르면 1~3위). 칭호 제외 회원은 건너뜀. 1분 캐시 */
export async function getHonorInfo(): Promise<HonorInfo> {
  const now = Date.now();
  const config = await loadTitleConfig();
  // 설정이 바뀌면(관리자 저장) 1분을 기다리지 않고 다시 계산 — 페이지와 API는 캐시가 따로라 설정으로 맞춤
  const configKey = JSON.stringify(config);
  if (honorCache && honorCache.config === configKey && now - honorCache.at < 60_000) return honorCache.info;
  const keys = HONOR_KEYS.filter((k) => config.honors[k].enabled);
  const excluded = config.excluded.length
    ? new Set((await prisma.user.findMany({ where: { id: { in: config.excluded } }, select: { nickname: true } })).map((u) => u.nickname))
    : new Set<string>();
  const owners = Object.fromEntries(HONOR_KEYS.map((k) => [k, [] as string[]])) as Record<HonorKey, string[]>;
  await Promise.all(
    keys.map(async (key) => {
      const def = HONOR_DEFS[key];
      // 오목은 게임 전적 랭킹(이번 달 · 3판 이상), 나머지는 /ranking 랭킹
      const isGame = def.tab === "omok" || def.tab === "yut" || def.tab === "chess";
      const rows = isGame
        ? await import("@/lib/game-stats").then((m) => m.gameRanking(def.tab as "omok", "month", 1)).catch(() => [])
        : def.tab === "answers" || def.tab === "bestPost"
          ? await communityHonorRows(def.tab).catch(() => [])
          : await getRanking(def.tab as "level", def.period).catch(() => []);
      owners[key] = rows
        .filter((r) => !excluded.has(r.nickname) && r.score >= (HONOR_DEFS[key].minScore ?? 0))
        // 미니게임은 1위 한 명만
        .slice(0, isGame ? 1 : config.honors[key].top)
        .map((r) => r.nickname);
    }),
  );
  // 순서는 HONOR_KEYS 순(레벨 → 주간 → 월간 → 마크 → 출석), 같은 칭호면 높은 순위부터
  const holders: Record<string, HonorHold[]> = {};
  for (const key of keys) owners[key].forEach((nick, i) => (holders[nick] ??= []).push({ key, rank: i + 1 }));
  // 대표 칭호: 칭호를 가진 사람(랭킹 칭호 · 팟 계산)만 읽음
  const pot = await getPotTitleInfo().catch(() => null);
  const holderNicks = [...new Set([...Object.keys(holders), ...Object.keys(pot?.holders ?? {})])];
  const main: Record<string, string> = {};
  if (holderNicks.length) {
    const users = await prisma.user.findMany({ where: { nickname: { in: holderNicks } }, select: { id: true, nickname: true } });
    const picks = await prisma.toolSaved
      .findMany({ where: { kind: KIND_MAIN, ownerId: { in: users.map((u) => u.id) } }, select: { ownerId: true, name: true } })
      .catch(() => []);
    const nickOf = new Map(users.map((u) => [u.id, u.nickname]));
    for (const p of picks) {
      const nick = nickOf.get(p.ownerId);
      if (nick) main[nick] = p.name;
    }
  }
  const info: HonorInfo = {
    main,
    defs: keys.map((k) => ({ key: k, icon: HONOR_DEFS[k].icon, name: config.honors[k].name, desc: HONOR_DEFS[k].desc, top: config.honors[k].top })),
    holders,
    owners,
  };
  honorCache = { at: now, info, config: configKey };
  // 새로 받은 칭호는 기록 · LIVE 띠(응답은 기다리지 않음)
  void recordAwards(info, config).catch(() => undefined);
  return info;
}

/**
 * 커뮤니티 칭호 순위(이번 달 · 운영 계정 · 탈퇴 회원 제외)
 * answers: 채택된 답변 수 / bestPost: 이번 달 쓴 글 중 가장 많이 받은 추천 수
 */
async function communityHonorRows(tab: "answers" | "bestPost"): Promise<{ nickname: string; score: number }[]> {
  const since = monthStartKst();
  const rows =
    tab === "answers"
      ? await prisma.$queryRaw<{ nickname: string; score: bigint }[]>`
          SELECT u.nickname, COUNT(*)::bigint AS score
          FROM "Comment" c JOIN "User" u ON u.id = c."authorId"
          WHERE c."acceptedAt" >= ${since} AND u."isMaster" = false AND u."withdrawnAt" IS NULL
          GROUP BY u.nickname ORDER BY score DESC, MIN(c."acceptedAt") ASC LIMIT 5`
      : await prisma.$queryRaw<{ nickname: string; score: bigint }[]>`
          SELECT u.nickname, MAX(p."upvoteCount")::bigint AS score
          FROM "Post" p JOIN "User" u ON u.id = p."authorId"
          WHERE p."createdAt" >= ${since} AND p.hidden = false AND p."isAttendanceThread" = false
            AND p."boardType" IN (FREE, HAND_REVIEW, RULE_QA, SKETCH)
            AND u."isMaster" = false AND u."withdrawnAt" IS NULL
          GROUP BY u.nickname ORDER BY score DESC, MIN(p."createdAt") ASC LIMIT 5`;
  return rows.map((r) => ({ nickname: r.nickname, score: Number(r.score) }));
}

/** ToolSaved 종류: 회원별 칭호 받은 기록(ownerId = 회원 id) */
const KIND_HISTORY = "honor-history";
const POT_ICONS = ["👹", "🪙", "🏮"] as const;
/** 이 서버에서 이미 기록한 것(같은 칭호를 1분마다 다시 확인하지 않게) */
const recorded = new Set<string>();

/** 기간 표시: 전체 · 이번 주(월요일 날짜) · 이번 달(YYYY-MM). 같은 기간에는 한 번만 기록 · 알림 */
function periodStamp(period: "all" | "week" | "month") {
  if (period === "week") return weekStartKst();
  if (period === "month") return todayKstDate().slice(0, 7);
  return "all";
}

type Award = { key: string; rank: number; nickname: string; title: string; icon: string; stamp: string };

async function recordAwards(info: HonorInfo, config: TitleConfig) {
  const awards: Award[] = [];
  for (const d of info.defs) {
    info.owners[d.key].forEach((nickname, i) =>
      awards.push({ key: d.key, rank: i + 1, nickname, title: i ? `${d.name} · ${i + 1}위` : d.name, icon: d.icon, stamp: periodStamp(HONOR_DEFS[d.key].period) }),
    );
  }
  const pot = await getPotTitleInfo().catch(() => null);
  if (pot?.enabled) {
    for (const [nickname, rank] of Object.entries(pot.holders)) {
      awards.push({ key: "pot", rank, nickname, title: pot.names[rank], icon: POT_ICONS[rank - 1], stamp: config.period === "month" ? periodStamp("month") : "all" });
    }
  }
  const fresh = awards.filter((a) => !recorded.has(`${a.key}:${a.rank}:${a.stamp}:${a.nickname}`));
  if (fresh.length === 0) return;
  const users = await prisma.user.findMany({ where: { nickname: { in: [...new Set(fresh.map((a) => a.nickname))] } }, select: { id: true, nickname: true } });
  const idOf = new Map(users.map((u) => [u.nickname, u.id]));
  for (const a of fresh) {
    const userId = idOf.get(a.nickname);
    recorded.add(`${a.key}:${a.rank}:${a.stamp}:${a.nickname}`);
    if (!userId) continue;
    const tag = `${a.key}:${a.rank}:${a.stamp}`;
    // id를 칭호 · 순위 · 기간으로 정해 두어, 여러 요청이 동시에 와도 한 번만 저장됨(이미 있으면 건너뜀)
    const { count } = await prisma.toolSaved.createMany({
      data: [{ id: `honor_${userId}_${tag}`, ownerId: userId, kind: KIND_HISTORY, name: tag, dataJson: JSON.stringify({ key: a.key, rank: a.rank, title: a.title, icon: a.icon, stamp: a.stamp }) }],
      skipDuplicates: true,
    });
    if (count === 0) continue;
    // 받은 사람 기기로 축하 알림(알림을 켠 기기만 · 실패해도 무시)
    await notifyUser(userId, {
      title: `${a.icon} 칭호를 받았어요!`,
      body: `축하해요! 「${a.title}」 칭호가 닉네임 옆에 붙었어요.`,
      url: `/u/${encodeURIComponent(a.nickname)}`,
    }).catch(() => undefined);
    // 이름이 따로 있는 칭호(랭킹 칭호 1위 · 팟 계산 1~3위)만 LIVE 띠로 알림
    if (a.rank === 1 || a.key === "pot") {
      await pushTicker({
        kind: `HONOR:${tag}:${userId}`,
        message: `${a.icon} ${a.nickname}님이 「${a.title}」 칭호를 받았습니다!`,
        href: `/u/${encodeURIComponent(a.nickname)}`,
      });
    }
  }
}

/** 회원이 받았던 칭호 기록(최근 것부터) */
export type HonorRecord = { key: string; rank: number; title: string; icon: string; stamp: string; at: string };
export async function listHonorHistory(userId: string, take = 30): Promise<HonorRecord[]> {
  const rows = await prisma.toolSaved
    .findMany({ where: { ownerId: userId, kind: KIND_HISTORY }, orderBy: { createdAt: "desc" }, take, select: { dataJson: true, createdAt: true } })
    .catch(() => []);
  return rows.flatMap((r) => {
    try {
      return [{ ...(JSON.parse(r.dataJson) as Omit<HonorRecord, "at">), at: r.createdAt.toISOString() }];
    } catch {
      return [];
    }
  });
}

/** 기록·설정이 바뀌면 바로 반영되게 */
export function clearPotTitleCache() {
  clearRankingCache();
  titleCache = null;
  configCache = null;
  honorCache = null;
}

/** 칭호 계산 캐시 비우기(닉네임이 바뀌었을 때 등) */
export function clearHonorCache() {
  honorCache = null;
}
