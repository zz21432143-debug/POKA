import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import {
  FEED,
  PET_MAX,
  YOKAI,
  feedsAllowed,
  fullnessNow,
  moodLine,
  nextFeedTime,
  nextPetTime,
  nextStageProgress,
  stageForExp,
  waitText,
  isSpecies,
  RARITY_ORDER,
  type FeedSources,
  type YokaiSpecies,
} from "@/lib/yokai";
import { arrivals, gumihoTails, progressLine, type OwnedStages, type YokaiStats } from "@/lib/yokai-achieve";

/** 요괴 마을을 모두에게 공개했는지(공개 전에는 LIVE 공지 · 닉네임 옆 요괴를 안 보임) */
export const yokaiPublic = () => process.env.YOKAI_PUBLIC === "1";

export type YokaiActive = {
  species: YokaiSpecies;
  name: string;
  stage: number;
  stageName: string;
  exp: number;
  next: ReturnType<typeof nextStageProgress>;
  fullness: number;
  affection: number;
  /** 배불러서 못 먹으면 다시 먹을 수 있는 시각(ISO) */
  nextFeedAt: string | null;
  /** 쓰다듬기 쉬는 중이면 다시 할 수 있는 시각(ISO) */
  nextPetAt: string | null;
  pets: { used: number; max: number };
};

export type YokaiView = {
  active: YokaiActive;
  owned: { species: YokaiSpecies; stage: number }[];
  main: YokaiSpecies;
  feeds: { used: number; allowed: number; sources: FeedSources };
  dex: YokaiSpecies[];
  /** 새로 찾아와서 아직 등장 알림을 안 본 요괴 */
  newcomers: YokaiSpecies[];
  /** 못 만난 요괴 진행도 한 줄 */
  progress: Partial<Record<YokaiSpecies, string>>;
  tails: { label: string; done: boolean; progress: string }[];
  mood: string;
};

const FREE_BOARDS = ["FREE", "RULE_QA", "SKETCH"] as const;

/** 오늘(KST) 밥이 늘어나는 활동: 출석 · 퀴즈 정답 · 글이나 댓글(출석 댓글 빼고) */
async function feedSources(userId: string): Promise<FeedSources> {
  const day = todayKstDate();
  const since = new Date(Date.parse(`${day}T00:00:00+09:00`));
  const [attended, quiz, posts, comments] = await Promise.all([
    prisma.dailyAttendance.count({ where: { userId, date: day } }).catch(() => 0),
    prisma.quizAnswer.count({ where: { userId, correct: true, createdAt: { gte: since } } }).catch(() => 0),
    prisma.post.count({ where: { authorId: userId, createdAt: { gte: since }, isAttendanceThread: false } }).catch(() => 0),
    prisma.comment.count({ where: { authorId: userId, createdAt: { gte: since }, isAttendanceCheck: false } }).catch(() => 0),
  ]);
  return { attended: attended > 0, quiz: quiz > 0, wrote: posts + comments > 0 };
}

const num = (v: unknown) => Number(v ?? 0) || 0;
const safe = <T,>(p: Promise<T>) => p.catch(() => null);
const countOf = (rows: { n: bigint | number | null }[] | null) => num(rows?.[0]?.n);

/** 요괴가 찾아오는 조건에 쓰는 활동 기록 */
export async function loadYokaiStats(userId: string): Promise<YokaiStats> {
  const [user, attendDays, dawn, freePosts, freeComments, comments, handPosts, handVotes, urgentApply, urgentPosts, drillRuns, shares, boards, rotations, quizCorrect, tda, points, weekly, postUp, commentUp, honors, studyDays, streak] =
    await Promise.all([
      safe(prisma.user.findUnique({ where: { id: userId }, select: { level: true } })),
      safe(prisma.dailyAttendance.count({ where: { userId } })),
      safe(prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "DailyAttendance" WHERE "userId" = ${userId} AND EXTRACT(HOUR FROM ("createdAt" + interval '9 hours')) < 5`),
      safe(prisma.post.count({ where: { authorId: userId, boardType: { in: [...FREE_BOARDS] }, isAttendanceThread: false } })),
      safe(prisma.comment.count({ where: { authorId: userId, isAttendanceCheck: false, post: { boardType: { in: [...FREE_BOARDS] } } } })),
      safe(prisma.comment.count({ where: { authorId: userId, isAttendanceCheck: false } })),
      safe(prisma.post.count({ where: { authorId: userId, boardType: "HAND_REVIEW" } })),
      safe(prisma.handPollVote.count({ where: { userId } })),
      safe(prisma.jobApplication.count({ where: { applicantId: userId, post: { jobKind: "URGENT" } } })),
      safe(prisma.post.count({ where: { authorId: userId, jobKind: "URGENT" } })),
      safe(prisma.dealerDrillRun.count({ where: { userId } })),
      safe(prisma.toolSaved.count({ where: { ownerId: userId, kind: "share-user" } })),
      safe(prisma.gameBoard.count({ where: { ownerId: userId } })),
      safe(prisma.rotationMeta.count({ where: { ownerId: userId } })),
      safe(prisma.quizAnswer.count({ where: { userId, correct: true } })),
      safe(prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "QuizAnswer" a JOIN "DailyQuiz" q ON q.id = a."quizId" WHERE a."userId" = ${userId} AND a.correct = true AND q.kind = 'tda'`),
      safe(
        import("@/lib/point-ledger")
          .then((m) => m.ensurePointLedger())
          .then(() => prisma.$queryRaw<{ n: bigint | null }[]>`SELECT COALESCE(SUM(delta), 0) AS n FROM "PointLedger" WHERE "userId" = ${userId} AND delta > 0`),
      ),
      safe(import("@/lib/ranking").then((m) => m.exactRank("level", "week", userId))),
      safe(prisma.post.aggregate({ where: { authorId: userId }, _sum: { upvoteCount: true } })),
      safe(prisma.comment.aggregate({ where: { authorId: userId }, _sum: { upvoteCount: true } })),
      safe(import("@/lib/pot-titles").then((m) => m.listHonorHistory(userId, 200))),
      safe(prisma.toolSaved.count({ where: { ownerId: userId, kind: "study-day" } })),
      safe(import("@/lib/quiz-server").then((m) => m.quizStreak(userId))),
    ]);
  return {
    attendDays: num(attendDays),
    dawnAttend: countOf(dawn),
    freeActs: num(freePosts) + num(freeComments),
    comments: num(comments),
    handActs: num(handPosts) + num(handVotes),
    urgentActs: num(urgentApply) + num(urgentPosts),
    drillRuns: num(drillRuns),
    shares: num(shares),
    storeTools: num(boards) + num(rotations),
    quizStreak: num(streak),
    quizCorrect: num(quizCorrect),
    tdaCorrect: countOf(tda),
    pointsEarned: countOf(points),
    weeklyRank: weekly?.rank ?? null,
    level: num(user?.level),
    upvotes: num(postUp?._sum.upvoteCount) + num(commentUp?._sum.upvoteCount),
    monthlyHonors: (honors ?? []).filter((h) => /^\d{4}-\d{2}$/.test(h.stamp)).length,
    studyDays: num(studyDays),
  };
}

const parseList = (json: string): YokaiSpecies[] => {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter(isSpecies) : [];
  } catch {
    return [];
  }
};

type OwnedRow = NonNullable<Awaited<ReturnType<typeof prisma.yokaiOwned.findFirst>>>;

/** 날짜가 바뀌었으면 오늘 횟수는 0부터 */
const fedToday = (pet: { day: string; fedToday: number }) => (pet.day === todayKstDate() ? pet.fedToday : 0);
const pettedToday = (o: OwnedRow) => (o.petDay === todayKstDate() ? o.pettedToday : 0);
const ownedList = (userId: string) => prisma.yokaiOwned.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

/** 새로 찾아온 요괴를 가진 요괴로 넣음(전설이면 공개 후 LIVE 공지) */
async function grantArrivals(userId: string, owned: OwnedRow[], stats: YokaiStats) {
  const stages: OwnedStages = Object.fromEntries(owned.map((o) => [o.species, stageForExp(o.exp)]));
  const fresh = arrivals(stats, stages);
  if (!fresh.length) return owned;
  await prisma.yokaiOwned.createMany({ data: fresh.map((species) => ({ userId, species })), skipDuplicates: true });
  const legends = fresh.filter((s) => YOKAI[s].rarity === "legend");
  if (legends.length && yokaiPublic()) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    if (user) {
      await prisma.tickerEvent
        .createMany({
          data: legends.map((s) => ({ kind: `YOKAI:${userId}:${s}`, message: `${s === "gumiho" ? "🦊" : "👑"} ${user.nickname}님이 전설의 ${YOKAI[s].name}를 만났습니다!`, href: "/yokai" })),
          skipDuplicates: true,
        })
        .catch(() => undefined);
    }
  }
  return ownedList(userId);
}

export async function getYokai(userId: string): Promise<YokaiView | null> {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return null;
  let owned = await ownedList(userId);
  if (!owned.length && isSpecies(pet.species)) {
    await prisma.yokaiOwned.createMany({ data: [{ userId, species: pet.species }], skipDuplicates: true });
    owned = await ownedList(userId);
  }
  const [stats, sources] = await Promise.all([loadYokaiStats(userId), feedSources(userId)]);
  owned = await grantArrivals(userId, owned, stats);

  const valid = owned.filter((o) => isSpecies(o.species));
  if (!valid.length) return null;
  const activeRow = valid.find((o) => o.species === pet.activeSpecies) ?? valid[0];
  const species = activeRow.species as YokaiSpecies;
  const stage = stageForExp(activeRow.exp);
  const fullness = fullnessNow(activeRow.fullness, activeRow.fullnessAt);
  const allowed = feedsAllowed(sources);
  const used = fedToday(pet);
  const feedAt = nextFeedTime(fullness);
  const petAt = pettedToday(activeRow) < PET_MAX ? nextPetTime(activeRow.pettedAt) : null;
  const stages: OwnedStages = Object.fromEntries(valid.map((o) => [o.species, stageForExp(o.exp)]));
  const dex = valid.map((o) => o.species as YokaiSpecies);
  const seen = parseList(pet.seenJson);
  const progress: Partial<Record<YokaiSpecies, string>> = {};
  for (const s of Object.keys(YOKAI) as YokaiSpecies[]) {
    if (!stages[s]) {
      const line = progressLine(s, stats, stages);
      if (line) progress[s] = line;
    }
  }
  return {
    active: {
      species,
      name: YOKAI[species].name,
      stage,
      stageName: YOKAI[species].stages[stage - 1],
      exp: activeRow.exp,
      next: nextStageProgress(activeRow.exp),
      fullness,
      affection: activeRow.affection,
      nextFeedAt: feedAt?.toISOString() ?? null,
      nextPetAt: petAt?.toISOString() ?? null,
      pets: { used: pettedToday(activeRow), max: PET_MAX },
    },
    owned: valid.map((o) => ({ species: o.species as YokaiSpecies, stage: stageForExp(o.exp) })),
    main: isSpecies(pet.mainSpecies) && stages[pet.mainSpecies] ? pet.mainSpecies : species,
    feeds: { used, allowed, sources },
    dex,
    // 등장 알림은 낮은 등급부터 · 전설은 마지막에(가장 큰 연출)
    newcomers: dex.filter((s) => !seen.includes(s)).sort((x, y) => RARITY_ORDER.indexOf(YOKAI[x].rarity) - RARITY_ORDER.indexOf(YOKAI[y].rarity)),
    progress,
    tails: gumihoTails(stats, stages),
    mood: moodLine({ name: YOKAI[species].name, fullness, affection: activeRow.affection, feedsLeft: Math.max(0, allowed - used), src: sources }),
  };
}

/** 첫 요괴 고르기(이미 있으면 그대로 · 다시 고르기 없음) */
export async function chooseStarter(userId: string, species: YokaiSpecies) {
  if (YOKAI[species].rarity !== "starter") return { ok: false as const, error: "처음에는 도깨비 · 잉어 · 삼두구미 중에서 고를 수 있어요." };
  const made = await prisma.yokaiPet.createMany({
    data: [{ userId, species, dexJson: JSON.stringify([species]), seenJson: JSON.stringify([species]), activeSpecies: species, mainSpecies: species, day: todayKstDate() }],
    skipDuplicates: true,
  });
  if (made.count === 1) await prisma.yokaiOwned.createMany({ data: [{ userId, species }], skipDuplicates: true });
  return { ok: true as const };
}

async function activeOf(userId: string) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return null;
  const row =
    (await prisma.yokaiOwned.findUnique({ where: { userId_species: { userId, species: pet.activeSpecies || pet.species } } })) ??
    (await prisma.yokaiOwned.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }));
  return row ? { pet, row } : null;
}

/** 밥 주기: 오늘 밥 횟수 안에서, 배부르지 않을 때만. 진화하면 evolved에 새 단계 */
export async function feedYokai(userId: string) {
  const found = await activeOf(userId);
  if (!found) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  const { pet, row } = found;
  const now = new Date();
  const fullness = fullnessNow(row.fullness, row.fullnessAt, now);
  const full = nextFeedTime(fullness, now);
  if (full) return { ok: false as const, error: `배불러서 안 먹어요. ${waitText(full, now)} 뒤에 다시 주세요.` };
  const sources = await feedSources(userId);
  const used = fedToday(pet);
  if (used >= feedsAllowed(sources)) return { ok: false as const, error: "오늘 밥을 다 줬어요. 출석 · 퀴즈 · 글쓰기로 더 받을 수 있어요." };
  // 다른 탭에서 동시에 눌러도 한 번만(오늘 횟수가 그대로일 때만 바뀜)
  const counted = await prisma.yokaiPet.updateMany({ where: { id: pet.id, day: pet.day, fedToday: pet.fedToday }, data: { day: todayKstDate(), fedToday: used + 1 } });
  if (counted.count !== 1) return { ok: false as const, error: "잠시 뒤에 다시 눌러 주세요." };
  const exp = row.exp + FEED.exp;
  await prisma.yokaiOwned.update({
    where: { id: row.id },
    data: { exp, fullness: Math.min(100, fullness + FEED.fullness), fullnessAt: now, affection: Math.min(100, row.affection + FEED.affection) },
  });
  const before = stageForExp(row.exp);
  const after = stageForExp(exp);
  return { ok: true as const, evolved: after > before ? after : null };
}

/** 쓰다듬기: 요괴마다 하루 PET_MAX번 · 한 번 하면 잠시 쉬기 · 친밀도 +1 */
export async function petYokai(userId: string) {
  const found = await activeOf(userId);
  if (!found) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  const { row } = found;
  const now = new Date();
  const count = pettedToday(row);
  if (count >= PET_MAX) return { ok: false as const, error: "오늘은 충분히 쓰다듬어 줬어요. 내일 또 만나요!" };
  const wait = nextPetTime(row.pettedAt, now);
  if (wait) return { ok: false as const, error: `조금 쉬는 중이에요. ${waitText(wait, now)} 뒤에 다시 쓰다듬어 주세요.` };
  const done = await prisma.yokaiOwned.updateMany({
    where: { id: row.id, pettedAt: row.pettedAt },
    data: { affection: Math.min(100, row.affection + 1), petDay: todayKstDate(), pettedToday: count + 1, pettedAt: now },
  });
  if (done.count !== 1) return { ok: false as const, error: "잠시 뒤에 다시 눌러 주세요." };
  return { ok: true as const };
}

/** 키울 요괴 바꾸기 · 대표 요괴 정하기(가진 요괴만) */
export async function setYokai(userId: string, field: "active" | "main", species: YokaiSpecies) {
  const has = await prisma.yokaiOwned.findUnique({ where: { userId_species: { userId, species } }, select: { id: true } });
  if (!has) return { ok: false as const, error: "아직 만나지 못한 요괴예요." };
  await prisma.yokaiPet.update({ where: { userId }, data: field === "active" ? { activeSpecies: species } : { mainSpecies: species } });
  if (field === "main") repCache = null;
  return { ok: true as const };
}

/** 등장 알림을 봤음(가진 요괴 모두) */
export async function markSeen(userId: string) {
  const owned = await prisma.yokaiOwned.findMany({ where: { userId }, select: { species: true } });
  await prisma.yokaiPet.update({ where: { userId }, data: { seenJson: JSON.stringify(owned.map((o) => o.species)) } }).catch(() => undefined);
  return { ok: true as const };
}

/** 닉네임 옆 대표 요괴(공개 후에만): 닉네임 → 종류 · 단계. 1분 캐시 */
let repCache: { at: number; data: Record<string, { s: YokaiSpecies; st: number }> } | null = null;
export async function getYokaiReps(): Promise<Record<string, { s: YokaiSpecies; st: number }>> {
  if (!yokaiPublic()) return {};
  if (repCache && Date.now() - repCache.at < 60_000) return repCache.data;
  const rows = await prisma.$queryRaw<{ nickname: string; species: string; exp: number }[]>`
    SELECT u.nickname, o.species, o.exp FROM "YokaiPet" p
    JOIN "YokaiOwned" o ON o."userId" = p."userId" AND o.species = p."mainSpecies"
    JOIN "User" u ON u.id = p."userId"
    WHERE u."withdrawnAt" IS NULL
  `.catch(() => []);
  const data = Object.fromEntries(rows.filter((r) => isSpecies(r.species)).map((r) => [r.nickname, { s: r.species as YokaiSpecies, st: stageForExp(r.exp) }]));
  repCache = { at: Date.now(), data };
  return data;
}

/** 프로필에 보일 대표 요괴 */
export async function profileYokai(userId: string) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId }, select: { mainSpecies: true, species: true } }).catch(() => null);
  if (!pet) return null;
  const species = isSpecies(pet.mainSpecies) ? pet.mainSpecies : isSpecies(pet.species) ? pet.species : null;
  if (!species) return null;
  const [row, count] = await Promise.all([
    prisma.yokaiOwned.findUnique({ where: { userId_species: { userId, species } }, select: { exp: true } }).catch(() => null),
    prisma.yokaiOwned.count({ where: { userId } }).catch(() => 1),
  ]);
  const stage = stageForExp(row?.exp ?? 0);
  return { species, stage, name: YOKAI[species].name, stageName: YOKAI[species].stages[stage - 1], rarity: YOKAI[species].rarity, count };
}
