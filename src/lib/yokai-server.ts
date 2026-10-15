import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import {
  BOND_TIERS,
  GREET_AFFECTION,
  PET_AFFECTION,
  nextBond,
  FEED_COOLDOWN_MIN,
  MAIN_CHANGE_COST,
  SHOWER_COOLDOWN_MIN,
  bondName,
  cooldownUntil,
  later,
  FEED,
  PET_MAX,
  SHOWER_AFFECTION,
  cleanNow,
  feedExp,
  nextShowerTime,
  YOKAI,
  feedsAllowed,
  fullnessNow,
  nextFeedTime,
  nextPetTime,
  nextStageProgress,
  stageForExp,
  waitText,
  isSpecies,
  isBackground,
  bgReady,
  RARITY_ORDER,
  YOKAI_BACKGROUNDS,
  type YokaiBackground,
  type FeedSources,
  type YokaiSpecies,
} from "@/lib/yokai";
import { arrivals, gumihoTails, progressLine, type OwnedStages, type YokaiStats } from "@/lib/yokai-achieve";
import { pickLine, type LineKind } from "@/lib/yokai-lines";

/** 요괴 마을 공개 여부(기본 공개 · 급히 닫을 때 YOKAI_PUBLIC=0 → 마스터만) */
export const yokaiPublic = () => process.env.YOKAI_PUBLIC !== "0";

/** 간식: 포인트로 밥 한 번 더(하루 SNACK_MAX번) */
export const SNACK_PRICE = 500;
export const SNACK_MAX = 2;

/** 요괴 한 마리 상태(내 요괴들 · 보기용) */
export type YokaiCare = {
  species: YokaiSpecies;
  name: string;
  stage: number;
  stageName: string;
  exp: number;
  next: ReturnType<typeof nextStageProgress>;
  fullness: number;
  clean: number;
  affection: number;
  /** 친밀도 단계 이름 · 다음 보상 */
  bond: string;
  nextBond: ReturnType<typeof nextBond>;
  /** 이 요괴를 대표로 바꾸는 값(처음이면 0) */
  mainCost: number;
};

/** 대표 요괴(돌보는 요괴) + 돌보기 쿨타임(회원 단위 · 모든 요괴가 함께) */
export type YokaiActive = YokaiCare & {
  /** 배부르거나 밥 쿨타임이면 다시 줄 수 있는 시각(ISO) */
  nextFeedAt: string | null;
  /** 쓰다듬기 쉬는 중이면 다시 할 수 있는 시각(ISO) */
  nextPetAt: string | null;
  /** 아직 깨끗하거나 샤워 쿨타임이면 할 수 있는 시각(ISO) */
  nextShowerAt: string | null;
  pets: { used: number; max: number };
};

export type YokaiView = {
  /** 대표 요괴: 밥 · 쓰다듬기 · 샤워는 이 요괴만 */
  active: YokaiActive;
  owned: YokaiCare[];
  main: YokaiSpecies;
  /** 대표 요괴 바꾸기 값(P) */
  mainChangeCost: number;
  feeds: { used: number; allowed: number; sources: FeedSources };
  /** 오늘 산 간식 · 하루 최대 · 값 */
  snacks: { used: number; max: number; price: number };
  dex: YokaiSpecies[];
  /** 새로 찾아와서 아직 등장 알림을 안 본 요괴 */
  newcomers: YokaiSpecies[];
  /** 못 만난 요괴 진행도 한 줄 */
  progress: Partial<Record<YokaiSpecies, string>>;
  tails: { label: string; done: boolean; progress: string }[];
  /** 오늘 처음 들어와서 받은 인사 보너스(없으면 null) */
  greeting: { amount: number; bond: { at: number; points: number; name: string } | null } | null;
  /** 요괴 대사(성격 · 상황별) · 시스템 안내 한 줄 */
  mood: string;
  tip: string | null;
  /** 내 포인트 · 마을 배경(가진 것 · 쓰는 것) */
  points: number;
  bg: { owned: YokaiBackground[]; active: YokaiBackground };
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
      // 그날 푼 정답만(지난 문제를 몰아 풀어도 안 셈 · 퀴즈 랭킹과 같은 기준)
      safe(prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "QuizAnswer" a JOIN "DailyQuiz" q ON q.id = a."quizId" WHERE a."userId" = ${userId} AND a.correct = true AND (to_char(a."createdAt", 'YYYY-MM-DD') = left(q.day, 10) OR to_char(a."createdAt" + interval '9 hours', 'YYYY-MM-DD') = q.day)`),
      safe(prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM "QuizAnswer" a JOIN "DailyQuiz" q ON q.id = a."quizId" WHERE a."userId" = ${userId} AND a.correct = true AND q.kind = 'tda' AND (to_char(a."createdAt", 'YYYY-MM-DD') = left(q.day, 10) OR to_char(a."createdAt" + interval '9 hours', 'YYYY-MM-DD') = q.day)`),
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
    quizCorrect: countOf(quizCorrect),
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
const snacksToday = (pet: { snackDay: string; snacksToday: number }) => (pet.snackDay === todayKstDate() ? pet.snacksToday : 0);
const pettedToday = (pet: { petDay: string; pettedToday: number }) => (pet.petDay === todayKstDate() ? pet.pettedToday : 0);
const mainOf = (pet: { mainSpecies: string; activeSpecies: string; species: string }) => pet.mainSpecies || pet.activeSpecies || pet.species;

function careOf(o: OwnedRow, now = new Date()): YokaiCare {
  const species = o.species as YokaiSpecies;
  const stage = stageForExp(o.exp);
  return {
    species,
    name: YOKAI[species].name,
    stage,
    stageName: YOKAI[species].stages[stage - 1],
    exp: o.exp,
    next: nextStageProgress(o.exp),
    fullness: fullnessNow(o.fullness, o.fullnessAt, now),
    clean: cleanNow(o.clean, o.cleanAt, now),
    affection: o.affection,
    bond: bondName(o.affection),
    nextBond: nextBond(o.affection),
    mainCost: o.wasMain ? MAIN_CHANGE_COST : 0,
  };
}
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
  await prisma.yokaiPet.update({ where: { userId }, data: { arrivalCheckedAt: new Date() } }).catch(() => undefined);

  let valid = owned.filter((o) => isSpecies(o.species));
  if (!valid.length) return null;
  let activeRow = valid.find((o) => o.species === mainOf(pet)) ?? valid[0];
  // 하루 첫 방문 인사(친밀도 +) → 바뀐 값으로 다시 읽음
  const greeting = await greetToday(userId, pet, activeRow).catch(() => null);
  if (greeting) {
    valid = (await ownedList(userId)).filter((o) => isSpecies(o.species));
    activeRow = valid.find((o) => o.species === activeRow.species) ?? activeRow;
  }
  const species = activeRow.species as YokaiSpecies;
  const now = new Date();
  const care = careOf(activeRow, now);
  const { fullness, clean } = care;
  const allowed = feedsAllowed(sources) + snacksToday(pet);
  const used = fedToday(pet);
  const feedAt = later(nextFeedTime(fullness, now), cooldownUntil(pet.fedAt, FEED_COOLDOWN_MIN, now));
  const petAt = pettedToday(pet) < PET_MAX ? nextPetTime(pet.pettedAt, now) : null;
  const showerAt = later(nextShowerTime(clean, now), cooldownUntil(pet.showerAt, SHOWER_COOLDOWN_MIN, now));
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
      ...care,
      nextFeedAt: feedAt?.toISOString() ?? null,
      nextPetAt: petAt?.toISOString() ?? null,
      nextShowerAt: showerAt?.toISOString() ?? null,
      pets: { used: pettedToday(pet), max: PET_MAX },
    },
    owned: valid.map((o) => careOf(o, now)),
    main: species,
    mainChangeCost: MAIN_CHANGE_COST,
    feeds: { used, allowed, sources },
    snacks: { used: snacksToday(pet), max: SNACK_MAX, price: SNACK_PRICE },
    dex,
    // 등장 알림은 낮은 등급부터 · 전설은 마지막에(가장 큰 연출)
    newcomers: dex.filter((s) => !seen.includes(s)).sort((x, y) => RARITY_ORDER.indexOf(YOKAI[x].rarity) - RARITY_ORDER.indexOf(YOKAI[y].rarity)),
    progress,
    tails: gumihoTails(stats, stages),
    greeting,
    mood: pickLine(species, situation(fullness, clean), Math.floor(Date.now() / 3_600_000)),
    tip: tipLine({ fullness, clean, feedsLeft: Math.max(0, allowed - used), src: sources }),
    points: (await prisma.user.findUnique({ where: { id: userId }, select: { points: true } }).catch(() => null))?.points ?? 0,
    bg: bgState(pet),
  };
}

function bgState(pet: { bgOwnedJson: string; bgActive: string }) {
  let owned: YokaiBackground[] = ["default"];
  try {
    const v = JSON.parse(pet.bgOwnedJson) as unknown;
    if (Array.isArray(v)) owned = ["default", ...v.filter((x): x is YokaiBackground => isBackground(x) && x !== "default")];
  } catch {
    /* 기본만 */
  }
  return { owned, active: isBackground(pet.bgActive) && owned.includes(pet.bgActive) ? pet.bgActive : ("default" as YokaiBackground) };
}

/** 마을 배경 사기(포인트 바로 차감 · 이미 있으면 안 삼) */
export async function buyBackground(userId: string, id: YokaiBackground) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  const state = bgState(pet);
  if (state.owned.includes(id)) return { ok: false as const, error: "이미 가진 배경이에요." };
  if (!bgReady(id)) return { ok: false as const, error: "새 그림을 준비 중인 배경이에요. 곧 다시 열려요!" };
  const price = YOKAI_BACKGROUNDS[id].price;
  // 포인트가 모자라면 안 바뀜(동시에 눌러도 한 번만)
  const paid = await prisma.user.updateMany({ where: { id: userId, points: { gte: price } }, data: { points: { decrement: price } } });
  if (paid.count !== 1) return { ok: false as const, error: `포인트가 모자라요(${price.toLocaleString()}P 필요).` };
  await prisma.yokaiPet.update({ where: { userId }, data: { bgOwnedJson: JSON.stringify([...state.owned, id]), bgActive: id } });
  return { ok: true as const };
}

export async function applyBackground(userId: string, id: YokaiBackground) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet || !bgState(pet).owned.includes(id)) return { ok: false as const, error: "아직 없는 배경이에요." };
  await prisma.yokaiPet.update({ where: { userId }, data: { bgActive: id } });
  return { ok: true as const };
}

/** 지금 상황 → 대사 종류(배고픔 → 꼬질꼬질 → 배부름 → 인사) */
function situation(fullness: number, clean: number): LineKind {
  if (fullness < 20) return "hungry";
  if (clean < 30) return "dirty";
  if (fullness >= 80) return "full";
  return "greet";
}

/** 할 일 안내 한 줄(대사와 따로) */
function tipLine(i: { fullness: number; clean: number; feedsLeft: number; src: FeedSources }) {
  if (i.clean < 30) return "🛁 꼬질꼬질해요. 샤워시키면 밥 경험치 보너스가 다시 붙어요";
  if (i.feedsLeft > 0 && i.fullness < 80) return `🍙 오늘 밥이 ${i.feedsLeft}번 남았어요`;
  if (!i.src.attended) return "📅 출석하면 오늘 밥이 하나 더 생겨요";
  if (!i.src.quiz) return "🧩 오늘의 퀴즈를 맞히면 밥이 하나 더 생겨요";
  if (!i.src.wrote) return "✍️ 글이나 댓글을 쓰면 밥이 하나 더 생겨요";
  return null;
}

/** 첫 요괴 고르기(이미 있으면 그대로 · 다시 고르기 없음) */
export async function chooseStarter(userId: string, species: YokaiSpecies) {
  if (YOKAI[species].rarity !== "starter") return { ok: false as const, error: "처음에는 도깨비 · 잉어 · 삼두구미 중에서 고를 수 있어요." };
  const made = await prisma.yokaiPet.createMany({
    data: [{ userId, species, dexJson: JSON.stringify([species]), seenJson: JSON.stringify([species]), activeSpecies: species, mainSpecies: species, day: todayKstDate() }],
    skipDuplicates: true,
  });
  if (made.count === 1) await prisma.yokaiOwned.createMany({ data: [{ userId, species, wasMain: true }], skipDuplicates: true });
  // 첫 요괴 = 대표 요괴: 닉네임 옆에 바로 보이게
  repCache = null;
  return { ok: true as const };
}

/** 대표 요괴(돌보는 요괴) */
async function activeOf(userId: string) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return null;
  const row =
    (await prisma.yokaiOwned.findUnique({ where: { userId_species: { userId, species: mainOf(pet) } } })) ??
    (await prisma.yokaiOwned.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } }));
  return row ? { pet, row } : null;
}

/** 친밀도가 단계(10 · 30 · 50 · 70 · 100)를 넘으면 한 번만 보상 · 한꺼번에 여러 단계를 넘으면 모두 더해서 */
async function grantBond(userId: string, row: OwnedRow, affection: number) {
  const passed = BOND_TIERS.filter((t) => affection >= t.at && row.bondReward < t.at);
  if (!passed.length) return null;
  const top = passed[passed.length - 1];
  const points = passed.reduce((sum, t) => sum + t.points, 0);
  const claimed = await prisma.yokaiOwned.updateMany({ where: { id: row.id, bondReward: row.bondReward }, data: { bondReward: top.at } });
  if (claimed.count !== 1) return null;
  const { grantRewards } = await import("@/lib/exp");
  await grantRewards(userId, 0, points, { ignorePointCap: true }).catch(() => undefined);
  return { at: top.at, points, name: top.name };
}

/** 하루 첫 방문 인사: 대표 요괴 친밀도 +GREET_AFFECTION(하루 한 번 · 동시에 열어도 한 번) */
async function greetToday(userId: string, pet: { id: string; greetDay: string }, row: OwnedRow) {
  const day = todayKstDate();
  if (pet.greetDay === day) return null;
  const claimed = await prisma.yokaiPet.updateMany({ where: { id: pet.id, greetDay: pet.greetDay }, data: { greetDay: day } });
  if (claimed.count !== 1) return null;
  const affection = Math.min(100, row.affection + GREET_AFFECTION);
  await prisma.yokaiOwned.update({ where: { id: row.id }, data: { affection } });
  const bond = await grantBond(userId, row, affection);
  return { amount: affection - row.affection, bond };
}

type CareResult = { ok: true; evolved?: number | null; bond?: { at: number; points: number; name: string } | null } | { ok: false; error: string };

/** 밥 주기(대표 요괴만): 오늘 밥 횟수 안에서 · 배부르지 않고 밥 쿨타임(모든 요괴 함께)이 지났을 때. 진화하면 evolved */
export async function feedYokai(userId: string): Promise<CareResult> {
  const found = await activeOf(userId);
  if (!found) return { ok: false, error: "먼저 요괴를 골라 주세요." };
  const { pet, row } = found;
  const now = new Date();
  const fullness = fullnessNow(row.fullness, row.fullnessAt, now);
  const full = nextFeedTime(fullness, now);
  if (full) return { ok: false, error: `배불러서 안 먹어요. ${waitText(full, now)} 뒤에 다시 주세요.` };
  const cool = cooldownUntil(pet.fedAt, FEED_COOLDOWN_MIN, now);
  if (cool) return { ok: false, error: `방금 밥을 줬어요. ${waitText(cool, now)} 뒤에 다시 줄 수 있어요(모든 요괴 함께).` };
  const sources = await feedSources(userId);
  const used = fedToday(pet);
  if (used >= feedsAllowed(sources) + snacksToday(pet)) return { ok: false, error: "오늘 밥을 다 줬어요. 출석 · 퀴즈 · 글쓰기로 더 받을 수 있어요." };
  // 다른 탭에서 동시에 눌러도 한 번만(오늘 횟수가 그대로일 때만 바뀜)
  const counted = await prisma.yokaiPet.updateMany({ where: { id: pet.id, day: pet.day, fedToday: pet.fedToday }, data: { day: todayKstDate(), fedToday: used + 1, fedAt: now } });
  if (counted.count !== 1) return { ok: false, error: "잠시 뒤에 다시 눌러 주세요." };
  const exp = row.exp + feedExp(cleanNow(row.clean, row.cleanAt, now));
  const affection = Math.min(100, row.affection + FEED.affection);
  await prisma.yokaiOwned.update({ where: { id: row.id }, data: { exp, fullness: Math.min(100, fullness + FEED.fullness), fullnessAt: now, affection } });
  const before = stageForExp(row.exp);
  const after = stageForExp(exp);
  return { ok: true, evolved: after > before ? after : null, bond: await grantBond(userId, row, affection) };
}

/** 쓰다듬기(대표 요괴만): 하루 PET_MAX번 · 한 번 하면 쉬기(모든 요괴 함께) · 친밀도 +PET_AFFECTION */
export async function petYokai(userId: string): Promise<CareResult> {
  const found = await activeOf(userId);
  if (!found) return { ok: false, error: "먼저 요괴를 골라 주세요." };
  const { pet, row } = found;
  const now = new Date();
  const count = pettedToday(pet);
  if (count >= PET_MAX) return { ok: false, error: "오늘은 충분히 쓰다듬어 줬어요. 내일 또 만나요!" };
  const wait = nextPetTime(pet.pettedAt, now);
  if (wait) return { ok: false, error: `조금 쉬는 중이에요. ${waitText(wait, now)} 뒤에 다시 쓰다듬어 주세요.` };
  const done = await prisma.yokaiPet.updateMany({ where: { id: pet.id, pettedAt: pet.pettedAt }, data: { petDay: todayKstDate(), pettedToday: count + 1, pettedAt: now } });
  if (done.count !== 1) return { ok: false, error: "잠시 뒤에 다시 눌러 주세요." };
  const affection = Math.min(100, row.affection + PET_AFFECTION);
  await prisma.yokaiOwned.update({ where: { id: row.id }, data: { affection } });
  return { ok: true, bond: await grantBond(userId, row, affection) };
}

/** 샤워(대표 요괴만): 청결도가 SHOWER_BELOW 미만 · 샤워 쿨타임(모든 요괴 함께)이 지났을 때 · 100으로 · 친밀도 +SHOWER_AFFECTION */
export async function showerYokai(userId: string): Promise<CareResult> {
  const found = await activeOf(userId);
  if (!found) return { ok: false, error: "먼저 요괴를 골라 주세요." };
  const { pet, row } = found;
  const now = new Date();
  const wait = nextShowerTime(cleanNow(row.clean, row.cleanAt, now), now);
  if (wait) return { ok: false, error: `아직 깨끗해요. ${waitText(wait, now)} 뒤에 씻겨 주세요.` };
  const cool = cooldownUntil(pet.showerAt, SHOWER_COOLDOWN_MIN, now);
  if (cool) return { ok: false, error: `방금 샤워했어요. ${waitText(cool, now)} 뒤에 다시 할 수 있어요(모든 요괴 함께).` };
  const done = await prisma.yokaiPet.updateMany({ where: { id: pet.id, showerAt: pet.showerAt }, data: { showerAt: now } });
  if (done.count !== 1) return { ok: false, error: "잠시 뒤에 다시 눌러 주세요." };
  const affection = Math.min(100, row.affection + SHOWER_AFFECTION);
  await prisma.yokaiOwned.update({ where: { id: row.id }, data: { clean: 100, cleanAt: now, affection } });
  return { ok: true, bond: await grantBond(userId, row, affection) };
}

/** 대표 요괴 바꾸기(가진 요괴만 · MAIN_CHANGE_COST P 차감 · 쿨타임은 그대로 이어짐) */
export async function setMainYokai(userId: string, species: YokaiSpecies) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  if (mainOf(pet) === species) return { ok: true as const };
  const has = await prisma.yokaiOwned.findUnique({ where: { userId_species: { userId, species } }, select: { id: true, wasMain: true } });
  if (!has) return { ok: false as const, error: "아직 만나지 못한 요괴예요." };
  // 처음 대표로 정하는 요괴는 무료(동시에 눌러도 한 번만 무료)
  const firstTime = !has.wasMain && (await prisma.yokaiOwned.updateMany({ where: { id: has.id, wasMain: false }, data: { wasMain: true } })).count === 1;
  if (!firstTime) {
    const paid = await prisma.user.updateMany({ where: { id: userId, points: { gte: MAIN_CHANGE_COST } }, data: { points: { decrement: MAIN_CHANGE_COST } } });
    if (paid.count !== 1) return { ok: false as const, error: `포인트가 모자라요(${MAIN_CHANGE_COST}P 필요).` };
  }
  await prisma.yokaiPet.update({ where: { userId }, data: { mainSpecies: species, activeSpecies: species } });
  repCache = null;
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

/** 홈 · 내정보 알림용: 새로 찾아온 요괴 수 · 키우는 요괴가 배고픈지 · 아직 요괴가 없으면 초대. 조건 검사는 회원마다 30분에 한 번(DB에 시각) */
export async function yokaiNudge(userId: string) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } }).catch(() => null);
  if (!pet) return { invite: true as const };
  let owned = await ownedList(userId);
  if (!pet.arrivalCheckedAt || Date.now() - pet.arrivalCheckedAt.getTime() > 30 * 60_000) {
    // 먼저 시각을 찍어 동시에 여러 번 검사하지 않게
    const claimed = await prisma.yokaiPet.updateMany({ where: { userId, arrivalCheckedAt: pet.arrivalCheckedAt }, data: { arrivalCheckedAt: new Date() } }).catch(() => ({ count: 0 }));
    if (claimed.count === 1) owned = await grantArrivals(userId, owned, await loadYokaiStats(userId)).catch(() => owned);
  }
  const seen = parseList(pet.seenJson);
  const newcomers = owned.filter((o) => isSpecies(o.species) && !seen.includes(o.species as YokaiSpecies)).map((o) => o.species as YokaiSpecies);
  const active = owned.find((o) => o.species === pet.activeSpecies) ?? owned[0];
  if (!active || !isSpecies(active.species)) return null;
  const fullness = fullnessNow(active.fullness, active.fullnessAt);
  const clean = cleanNow(active.clean, active.cleanAt);
  return { invite: false as const, newcomers, hungry: fullness < 30, dirty: clean < 30, species: active.species, stage: stageForExp(active.exp), name: YOKAI[active.species].name };
}

/** 간식 사기: 포인트로 오늘 밥 한 번 더(하루 SNACK_MAX번 · 동시에 눌러도 한 번씩) */
export async function buySnack(userId: string) {
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  const count = snacksToday(pet);
  if (count >= SNACK_MAX) return { ok: false as const, error: `간식은 하루 ${SNACK_MAX}번까지예요.` };
  const counted = await prisma.yokaiPet.updateMany({ where: { id: pet.id, snackDay: pet.snackDay, snacksToday: pet.snacksToday }, data: { snackDay: todayKstDate(), snacksToday: count + 1 } });
  if (counted.count !== 1) return { ok: false as const, error: "잠시 뒤에 다시 눌러 주세요." };
  const paid = await prisma.user.updateMany({ where: { id: userId, points: { gte: SNACK_PRICE } }, data: { points: { decrement: SNACK_PRICE } } });
  if (paid.count !== 1) {
    await prisma.yokaiPet.update({ where: { id: pet.id }, data: { snacksToday: count } }).catch(() => undefined);
    return { ok: false as const, error: `포인트가 모자라요(${SNACK_PRICE}P 필요).` };
  }
  return { ok: true as const };
}

/** 홈 「요괴 마을」 칸: 키우는 요괴 · 포만감 · 진화 진행 · 오늘 밥 · 도감 · 새 요괴(조건 검사는 yokaiNudge와 같이 30분에 한 번) */
export async function yokaiHome(userId: string) {
  const nudge = await yokaiNudge(userId);
  if (!nudge || nudge.invite) return null;
  const pet = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!pet) return null;
  const owned = (await ownedList(userId)).filter((o) => isSpecies(o.species));
  const active = owned.find((o) => o.species === mainOf(pet)) ?? owned[0];
  if (!active) return null;
  const species = active.species as YokaiSpecies;
  const sources = await feedSources(userId);
  const allowed = feedsAllowed(sources) + snacksToday(pet);
  const fullness = fullnessNow(active.fullness, active.fullnessAt);
  const stage = stageForExp(active.exp);
  return {
    species,
    name: YOKAI[species].name,
    stage,
    stageName: YOKAI[species].stages[stage - 1],
    rarity: YOKAI[species].rarity,
    fullness,
    clean: cleanNow(active.clean, active.cleanAt),
    affection: active.affection,
    bond: bondName(active.affection),
    nextBond: nextBond(active.affection),
    next: nextStageProgress(active.exp),
    feedsLeft: Math.max(0, allowed - fedToday(pet)),
    // 배부름 · 밥 쿨타임(모든 요괴 함께) 중 늦은 쪽
    feedAt: later(nextFeedTime(fullness), cooldownUntil(pet.fedAt, FEED_COOLDOWN_MIN))?.toISOString() ?? null,
    dex: owned.length,
    owned: owned.map((o) => ({ species: o.species as YokaiSpecies, stage: stageForExp(o.exp) })),
    newcomers: nudge.newcomers,
    bg: bgState(pet).active,
  };
}
