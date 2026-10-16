import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { addDays } from "@/lib/job-events";
import { JOB_REGIONS, openJobWhere, regionWhere, type JobRegion } from "@/lib/job-status";
import { openSlots, type SlotLine } from "@/lib/job-slots";

/** 빈자리 보드 한 줄(공고 정보 + 빈자리) */
export type BoardSlot = SlotLine & {
  postId: string;
  kind: string;
  company: string;
  location: string;
  pay: string | null;
  /** 3시간 안에 올라오거나 끌어올린 공고 */
  fresh: boolean;
};

const SELECT = {
  id: true,
  title: true,
  jobKind: true,
  jobLocation: true,
  jobCompanyName: true,
  jobPayType: true,
  jobPayAmount: true,
  content: true,
  jobEvents: true,
  jobWorkDate: true,
  jobWorkHours: true,
  jobHeadcount: true,
  jobEndDate: true,
  bumpedAt: true,
} as const;

const won = (v: string | null) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return n ? n.toLocaleString("ko-KR") : (v ?? "");
};

/** 지금 모집 중인 지원 딜러 · 급구(빈자리) · 대회 · 날짜 못 읽은 공고 */
export async function loadJobBoard(region: JobRegion | null) {
  const today = todayKstDate();
  const base = { boardType: "JOBS" as const, hidden: false, isAttendanceThread: false };
  const [rows, tournaments] = await Promise.all([
    prisma.post
      .findMany({
        where: { AND: [base, { jobKind: { in: ["APPLY", "URGENT"] } }, openJobWhere(), regionWhere(region)] },
        orderBy: { bumpedAt: "desc" },
        take: 300,
        select: SELECT,
      })
      .catch(() => []),
    prisma.post
      .findMany({
        where: { AND: [base, { jobKind: "TOURNAMENT" }, openJobWhere(), regionWhere(region)] },
        orderBy: { jobWorkDate: "asc" },
        take: 20,
        select: SELECT,
      })
      .catch(() => []),
  ]);
  const freshSince = Date.now() - 3 * 3600_000;
  const slots: BoardSlot[] = [];
  const undated: (typeof rows)[number][] = [];
  for (const p of rows) {
    const list = openSlots(p, today);
    if (!list.length) {
      undated.push(p);
      continue;
    }
    for (const s of list) {
      slots.push({
        ...s,
        postId: p.id,
        kind: p.jobKind ?? "APPLY",
        company: p.jobCompanyName || p.title.replace(/^\[[^\]]*\]\s*/, "").slice(0, 24),
        location: p.jobLocation ?? "",
        pay: p.jobPayAmount ? `${p.jobPayType ?? "시급"} ${won(p.jobPayAmount)}` : null,
        fresh: p.bumpedAt.getTime() > freshSince,
      });
    }
  }
  slots.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "URGENT" ? -1 : 0) - (b.kind === "URGENT" ? -1 : 0) || (a.time ?? "99").localeCompare(b.time ?? "99"));
  return {
    today,
    slots,
    undated: undated.slice(0, 20).map((p) => ({ id: p.id, title: p.title, location: p.jobLocation ?? "" })),
    tournaments: tournaments.map((t) => ({
      id: t.id,
      name: t.jobCompanyName || t.title,
      location: t.jobLocation ?? "",
      start: t.jobWorkDate,
      end: t.jobEndDate,
      headcount: t.jobHeadcount,
      pay: t.jobPayAmount ? `${t.jobPayType ?? "시급"} ${won(t.jobPayAmount)}` : null,
      days: openSlots(t, today).slice(0, 10),
    })),
  };
}

/** 날짜 범위 거르기: today · tomorrow · week(7일) · all */
export function inRange(date: string, range: string, today: string) {
  if (range === "today") return date === today;
  if (range === "tomorrow") return date === addDays(today, 1);
  if (range === "week") return date <= addDays(today, 6);
  return true;
}

/* ───────── 딜러 「가능한 날」 ───────── */

export type DealerAvailability = { region: JobRegion | null; dates: string[]; anyDate: boolean };
const AVAIL_KIND = "dealer-available";
const availId = (userId: string) => `avail_${userId}`;

export async function readAvailability(userId: string): Promise<DealerAvailability | null> {
  const row = await prisma.toolSaved.findUnique({ where: { id: availId(userId) }, select: { dataJson: true } }).catch(() => null);
  if (!row) return null;
  try {
    return cleanAvailability(JSON.parse(row.dataJson));
  } catch {
    return null;
  }
}

export function cleanAvailability(raw: unknown, today = todayKstDate()): DealerAvailability {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const region = (JOB_REGIONS as readonly string[]).includes(String(v.region)) ? (v.region as JobRegion) : null;
  const dates = Array.isArray(v.dates)
    ? [...new Set(v.dates.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today && d <= addDays(today, 30)))].sort().slice(0, 31)
    : [];
  return { region, dates, anyDate: v.anyDate === true };
}

export async function saveAvailability(userId: string, a: DealerAvailability) {
  const dataJson = JSON.stringify(a);
  await prisma.toolSaved.upsert({
    where: { id: availId(userId) },
    create: { id: availId(userId), ownerId: userId, kind: AVAIL_KIND, name: a.region ?? "", dataJson },
    update: { name: a.region ?? "", dataJson },
  });
}

export async function clearAvailability(userId: string) {
  await prisma.toolSaved.deleteMany({ where: { id: availId(userId) } });
}

/** 날짜별 「가능한 딜러」 수(지역을 고르면 그 지역만) — 닉네임은 안 보여 줌 */
export async function availableCounts(region: JobRegion | null) {
  const rows = await prisma.toolSaved
    .findMany({ where: { kind: AVAIL_KIND, updatedAt: { gte: new Date(Date.now() - 31 * 86_400_000) }, ...(region ? { name: region } : {}) }, select: { dataJson: true } })
    .catch(() => []);
  const today = todayKstDate();
  const out = new Map<string, number>();
  for (const r of rows) {
    try {
      for (const d of cleanAvailability(JSON.parse(r.dataJson), today).dates) out.set(d, (out.get(d) ?? 0) + 1);
    } catch {
      /* 깨진 기록은 건너뜀 */
    }
  }
  return out;
}

/**
 * 새 빈자리가 생기면(공고 등록 · 붙여넣고 갱신): 그 지역 · 그 날짜에 「가능」을 등록했거나
 * 「이 지역 새 빈자리 알림」을 켠 딜러에게 알림(공고마다 한 사람 한 번).
 */
export async function notifySlotWatchers(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { ...SELECT, authorId: true, boardType: true } }).catch(() => null);
  if (!post || post.boardType !== "JOBS" || !["APPLY", "URGENT", "TOURNAMENT"].includes(post.jobKind ?? "")) return 0;
  const today = todayKstDate();
  const dates = new Set(openSlots(post, today).map((s) => s.date));
  if (!dates.size) return 0;
  const region = JOB_REGIONS.find((r) => (post.jobLocation ?? "").includes(r)) ?? null;
  if (!region) return 0;
  const watchers = await prisma.toolSaved.findMany({ where: { kind: AVAIL_KIND, name: region }, select: { ownerId: true, dataJson: true } }).catch(() => []);
  const { notifyUser } = await import("@/lib/push");
  let sent = 0;
  for (const w of watchers) {
    if (w.ownerId === post.authorId) continue;
    let a: DealerAvailability;
    try {
      a = cleanAvailability(JSON.parse(w.dataJson), today);
    } catch {
      continue;
    }
    const match = a.anyDate || a.dates.some((d) => dates.has(d));
    if (!match) continue;
    const made = await prisma.toolSaved
      .createMany({ data: [{ id: `slotnotify_${postId}_${w.ownerId}`, ownerId: w.ownerId, kind: "slot-notify", name: postId, dataJson: "{}" }], skipDuplicates: true })
      .catch(() => ({ count: 0 }));
    if (made.count !== 1) continue;
    const first = [...dates].sort()[0];
    const [, m, d] = first.split("-").map(Number);
    const r = await notifyUser(w.ownerId, {
      title: `📅 ${region} 새 빈자리`,
      body: `${post.jobCompanyName || "매장"} · ${m}/${d}${dates.size > 1 ? ` 외 ${dates.size - 1}일` : ""} 딜러를 구해요. 눌러서 보기`,
      url: `/posts/${postId}?from=push-slot`,
    }).catch(() => ({ sent: 0 }));
    sent += r.sent ?? 0;
  }
  return sent;
}
