import { prisma } from "@/lib/db";
import { AUTHOR_SELECT } from "@/components/user/user-badge";
import { displayMarkSrc } from "@/lib/mark-assets";
import { regionWhere, type JobRegion } from "@/lib/job-status";

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
  author: { nickname: string; level: number; markUrl: string | null; isMaster: boolean } | null;
};

const PHONE = /(0\d{1,2})[\s.-]?(\d{3,4})[\s.-]?(\d{4})/g;

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
        author: { select: AUTHOR_SELECT },
      },
    })
    .catch(() => []);
  const list = opts.after ? rows : rows.reverse();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return list.map<ChatMessage>((p) => {
    const text = p.content ?? "";
    return {
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
