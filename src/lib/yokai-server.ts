import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import {
  FEED,
  PET_MAX,
  YOKAI,
  feedsAllowed,
  fullnessNow,
  moodLine,
  nextStageProgress,
  stageForExp,
  type FeedSources,
  type YokaiSpecies,
} from "@/lib/yokai";

export type YokaiView = {
  species: YokaiSpecies;
  name: string;
  stage: number;
  stageName: string;
  exp: number;
  next: ReturnType<typeof nextStageProgress>;
  fullness: number;
  affection: number;
  feeds: { used: number; allowed: number; sources: FeedSources };
  pets: { used: number; max: number };
  dex: YokaiSpecies[];
  mood: string;
};

/** 오늘(KST) 밥이 늘어나는 활동: 출석 · 퀴즈 정답 · 글이나 댓글(출석 댓글 빼고) */
async function feedSources(userId: string): Promise<FeedSources> {
  const day = todayKstDate();
  const since = new Date(Date.parse(`${day}T00:00:00+09:00`));
  const [attended, quiz, posts, comments] = await Promise.all([
    prisma.dailyAttendance.count({ where: { userId, date: day } }).catch(() => 0),
    prisma.quizAnswer.count({ where: { userId, correct: true, createdAt: { gte: since } } }).catch(() => 0),
    prisma.post.count({ where: { authorId: userId, createdAt: { gte: since } } }).catch(() => 0),
    prisma.comment.count({ where: { authorId: userId, createdAt: { gte: since }, isAttendanceCheck: false } }).catch(() => 0),
  ]);
  return { attended: attended > 0, quiz: quiz > 0, wrote: posts + comments > 0 };
}

type Row = NonNullable<Awaited<ReturnType<typeof prisma.yokaiPet.findUnique>>>;

/** 날짜가 바뀌었으면 오늘 횟수는 0부터 */
const todayCounts = (row: Row) => (row.day === todayKstDate() ? { fed: row.fedToday, petted: row.pettedToday } : { fed: 0, petted: 0 });

function parseDex(json: string): YokaiSpecies[] {
  try {
    const list = JSON.parse(json) as unknown;
    return Array.isArray(list) ? (list.filter((s) => typeof s === "string" && s in YOKAI) as YokaiSpecies[]) : [];
  } catch {
    return [];
  }
}

async function toView(row: Row): Promise<YokaiView> {
  const species = row.species as YokaiSpecies;
  const sources = await feedSources(row.userId);
  const counts = todayCounts(row);
  const allowed = feedsAllowed(sources);
  const fullness = fullnessNow(row.fullness, row.fullnessAt);
  const stage = stageForExp(row.exp);
  return {
    species,
    name: YOKAI[species].name,
    stage,
    stageName: YOKAI[species].stages[stage - 1],
    exp: row.exp,
    next: nextStageProgress(row.exp),
    fullness,
    affection: row.affection,
    feeds: { used: counts.fed, allowed, sources },
    pets: { used: counts.petted, max: PET_MAX },
    dex: parseDex(row.dexJson),
    mood: moodLine({ name: YOKAI[species].name, fullness, affection: row.affection, feedsLeft: Math.max(0, allowed - counts.fed), src: sources }),
  };
}

export async function getYokai(userId: string): Promise<YokaiView | null> {
  const row = await prisma.yokaiPet.findUnique({ where: { userId } });
  return row ? toView(row) : null;
}

/** 첫 요괴 고르기(이미 있으면 그대로 · 다시 고르기 없음) */
export async function chooseStarter(userId: string, species: YokaiSpecies) {
  if (!YOKAI[species].starter) return { ok: false as const, error: "처음에는 도깨비 · 잉어 · 삼두구미 중에서 고를 수 있어요." };
  await prisma.yokaiPet.createMany({ data: [{ userId, species, dexJson: JSON.stringify([species]), day: todayKstDate() }], skipDuplicates: true });
  return { ok: true as const };
}

/** 밥 주기: 오늘 받은 밥 횟수 안에서만. 진화하면 evolved에 새 단계 */
export async function feedYokai(userId: string) {
  const row = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!row) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  const sources = await feedSources(userId);
  const counts = todayCounts(row);
  if (counts.fed >= feedsAllowed(sources)) return { ok: false as const, error: "오늘 밥을 다 줬어요. 출석 · 퀴즈 · 글쓰기로 더 받을 수 있어요." };
  const now = new Date();
  const exp = row.exp + FEED.exp;
  const before = stageForExp(row.exp);
  const after = stageForExp(exp);
  // 다른 탭에서 동시에 눌러도 한 번만(fedToday · day가 그대로일 때만 바뀜)
  const done = await prisma.yokaiPet.updateMany({
    where: { id: row.id, day: row.day, fedToday: row.fedToday },
    data: {
      exp,
      stage: after,
      fullness: Math.min(100, fullnessNow(row.fullness, row.fullnessAt, now) + FEED.fullness),
      fullnessAt: now,
      affection: Math.min(100, row.affection + FEED.affection),
      day: todayKstDate(),
      fedToday: counts.fed + 1,
      pettedToday: counts.petted,
    },
  });
  if (done.count !== 1) return { ok: false as const, error: "잠시 뒤에 다시 눌러 주세요." };
  return { ok: true as const, evolved: after > before ? after : null };
}

/** 쓰다듬기: 하루 PET_MAX번 · 친밀도 +1 */
export async function petYokai(userId: string) {
  const row = await prisma.yokaiPet.findUnique({ where: { userId } });
  if (!row) return { ok: false as const, error: "먼저 요괴를 골라 주세요." };
  const counts = todayCounts(row);
  if (counts.petted >= PET_MAX) return { ok: false as const, error: "오늘은 충분히 쓰다듬어 줬어요. 내일 또 만나요!" };
  const done = await prisma.yokaiPet.updateMany({
    where: { id: row.id, day: row.day, pettedToday: row.pettedToday },
    data: { affection: Math.min(100, row.affection + 1), day: todayKstDate(), pettedToday: counts.petted + 1, fedToday: counts.fed },
  });
  if (done.count !== 1) return { ok: false as const, error: "잠시 뒤에 다시 눌러 주세요." };
  return { ok: true as const };
}
