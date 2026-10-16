import { prisma } from "@/lib/db";
import { AUTHOR_SELECT } from "@/components/user/user-badge";
import { displayMarkSrc } from "@/lib/mark-assets";
import { regionWhere, type JobRegion } from "@/lib/job-status";
import { openSlots } from "@/lib/job-slots";

/**
 * 지원 딜러 「오픈채팅」: 공고 한 개 = 말풍선 한 개. 올리거나 끌어올린 순서(최신이 맨 아래).
 * 비로그인은 앞 몇 줄만(연락처 · 조건은 로그인 후 — 기존 공고 목록과 같은 기준).
 */
export type ChatMessage = {
  id: string;
  at: string;
  bumped: boolean;
  company: string | null;
  location: string | null;
  status: "open" | "closed";
  text: string;
  /** 비로그인에게 줄인 경우 */
  clipped: boolean;
  contact: string | null;
  /** 빈자리 칩(오늘 이후 · 비로그인도 보임) */
  slots: { date: string; time: string | null; count: string | null }[];
  /** 같은 사람이 같은 매장 공고를 다시 올려 이 말풍선은 이전 것 */
  superseded: boolean;
  /** 매장 로고(올려 둔 경우) */
  logoUrl: string | null;
  author: { nickname: string; level: number; markUrl: string | null; isMaster: boolean } | null;
};

const PHONE = /(0\d{1,2})[\s.-]?(\d{3,4})[\s.-]?(\d{4})/g;

/** 매장 로고 저장 키(작성자 · 매장 이름) */
export function storeLogoId(authorId: string, company: string) {
  const key = company.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase().slice(0, 40);
  return `storelogo_${authorId}_${key}`;
}

/** 작성자 · 매장들의 로고 주소 */
export async function storeLogos(pairs: { authorId: string | null; company: string | null }[]) {
  const ids = [...new Set(pairs.filter((p) => p.authorId && p.company).map((p) => storeLogoId(p.authorId!, p.company!)))];
  if (!ids.length) return new Map<string, string>();
  const rows = await prisma.toolSaved.findMany({ where: { id: { in: ids } }, select: { id: true, dataJson: true } }).catch(() => []);
  const out = new Map<string, string>();
  for (const r of rows) {
    try {
      const url = (JSON.parse(r.dataJson) as { url?: string }).url;
      if (url) out.set(r.id, url);
    } catch {
      /* 깨진 기록은 건너뜀 */
    }
  }
  return out;
}

function preview(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.slice(0, 4).join("\n").replace(PHONE, "010-****-****");
}

export async function loadApplyChat(opts: { region: JobRegion | null; before?: Date | null; after?: Date | null; guest: boolean; limit?: number }) {
  const limit = Math.min(opts.limit ?? 30, 60);
  const rows = await prisma.post
    .findMany({
      where: {
        AND: [
          { boardType: "JOBS", jobKind: "APPLY", hidden: false, isAttendanceThread: false },
          regionWhere(opts.region),
          opts.before ? { bumpedAt: { lt: opts.before } } : {},
          opts.after ? { bumpedAt: { gt: opts.after } } : {},
          { bumpedAt: { gte: new Date(Date.now() - 45 * 86_400_000) } },
        ],
      },
      orderBy: { bumpedAt: opts.after ? "asc" : "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        bumpedAt: true,
        jobCompanyName: true,
        jobLocation: true,
        jobFilled: true,
        jobDeadline: true,
        jobContact: true,
        jobEvents: true,
        jobWorkDate: true,
        jobWorkHours: true,
        jobHeadcount: true,
        authorId: true,
        author: { select: AUTHOR_SELECT },
      },
    })
    .catch(() => []);
  const list = opts.after ? rows : rows.reverse();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  // 같은 사람 · 같은 매장: 가장 최근 것만 펼쳐 두고 이전 것은 접기(채팅방이 같은 내용으로 도배되지 않게)
  const logos = await storeLogos(list.map((p) => ({ authorId: p.authorId, company: p.jobCompanyName })));
  const latestKey = new Map<string, string>();
  for (const p of list) latestKey.set(`${p.authorId}|${(p.jobCompanyName ?? "").replace(/\s+/g, "")}`, p.id);
  return list.map<ChatMessage>((p) => {
    const text = p.content ?? "";
    const key = `${p.authorId}|${(p.jobCompanyName ?? "").replace(/\s+/g, "")}`;
    return {
      slots: openSlots(p, today).slice(0, 8).map((s) => ({ date: s.date, time: s.time, count: s.count })),
      superseded: Boolean(p.jobCompanyName) && latestKey.get(key) !== p.id,
      logoUrl: p.authorId && p.jobCompanyName ? (logos.get(storeLogoId(p.authorId, p.jobCompanyName)) ?? null) : null,
      id: p.id,
      at: p.bumpedAt.toISOString(),
      bumped: p.bumpedAt.getTime() - p.createdAt.getTime() > 60_000,
      company: p.jobCompanyName?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "") || null,
      location: p.jobLocation,
      status: p.jobFilled || (p.jobDeadline && p.jobDeadline < today) ? "closed" : "open",
      text: opts.guest ? preview(text) : text,
      clipped: opts.guest && text.split(/\r?\n/).filter((l) => l.trim()).length > 4,
      contact: opts.guest ? null : p.jobContact,
      author: p.author && !p.author.withdrawnAt
        ? { nickname: p.author.nickname, level: p.author.level, markUrl: displayMarkSrc({ isMaster: p.author.isMaster, profileMarkImageUrl: p.author.profileMarkImageUrl }), isMaster: p.author.isMaster }
        : null,
    };
  });
}
