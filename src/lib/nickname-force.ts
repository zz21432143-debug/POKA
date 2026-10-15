import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { nicknameError } from "@/lib/nickname";
import { findForbiddenInNickname, loadDisabledBaseWords, loadForbiddenWordsFresh } from "@/lib/forbidden-words";
import { findNicknameOwner, nicknameProblem } from "@/lib/nickname-lookup";

/**
 * 닉네임 강제 변경(마스터): 「바른닉네임1234」로 바꾸고 닉네임 변경권 1장 · 알림 · 다음 방문 때 안내 띄움.
 * 안내 기록은 ToolSaved(kind "nick-forced", name pending → seen).
 */
export const FORCE_REASONS = {
  profanity: "비속어 · 욕설",
  impersonation: "운영진 · 타인 사칭",
  ad: "광고 · 홍보",
  etc: "운영 정책 위반",
} as const;
export type ForceReason = keyof typeof FORCE_REASONS;
export const isForceReason = (v: unknown): v is ForceReason =>
  typeof v === "string" && v in FORCE_REASONS;

const SAFE_BASE = "바른닉네임";

async function safeNickname() {
  for (let i = 0; i < 30; i += 1) {
    const candidate = `${SAFE_BASE}${randomInt(1000, 10000)}`;
    if (!(await findNicknameOwner(candidate))) return candidate;
  }
  return `${SAFE_BASE}${Date.now().toString().slice(-6)}`;
}

export async function forceNicknameChange(
  targetNickname: string,
  reason: ForceReason,
  actorId: string,
  ip: string,
  opts: { to?: string; ticket?: boolean } = {},
) {
  const user = await prisma.user.findFirst({
    where: { nickname: targetNickname },
    select: { id: true, nickname: true, isMaster: true },
  });
  if (!user) return { ok: false as const, error: "회원을 찾을 수 없어요." };
  if (user.isMaster)
    return { ok: false as const, error: "마스터 계정은 바꿀 수 없어요." };
  // 관리자가 직접 정한 닉네임(규칙 · 중복 검사) · 비우면 바른닉네임○○○○
  const wanted = opts.to?.trim().replace(/s+/g, "") ?? "";
  if (wanted) {
    const err = await nicknameProblem(wanted);
    if (err) return { ok: false as const, error: err };
    if (await findNicknameOwner(wanted, user.id))
      return { ok: false as const, error: "이미 쓰는 닉네임이에요." };
  }
  const to = wanted || (await safeNickname());
  const ticket = opts.ticket !== false;
  await prisma.user.update({
    where: { id: user.id },
    data: { nickname: to, ...(ticket ? { nicknameTickets: { increment: 1 } } : {}) },
  });
  await prisma.toolSaved.create({
    data: {
      ownerId: user.id,
      kind: "nick-forced",
      name: "pending",
      dataJson: JSON.stringify({
        from: user.nickname,
        to,
        reason,
        at: Date.now(),
      }),
    },
  });
  // 사이트 곳곳에 남은 옛 닉네임도 새 닉네임으로(전광판 · 응원 · 기록 · 랭킹 캐시)
  const { propagateNickname } = await import("@/lib/nickname-propagate");
  await propagateNickname(user.id, user.nickname, to).catch(() => undefined);
  const { writeAudit } = await import("@/lib/security");
  await writeAudit({
    kind: "nickname_forced",
    userId: actorId,
    ip,
    detail: `${user.nickname} → ${to} (${FORCE_REASONS[reason]})`,
  }).catch(() => undefined);
  const { notifyUser } = await import("@/lib/push");
  await notifyUser(user.id, {
    title: "닉네임이 변경되었어요",
    body: `${FORCE_REASONS[reason]} 관련으로 닉네임이 「${to}」로 바뀌었어요.${ticket ? " 닉네임 변경권 1장을 드렸어요." : ""}`,
    url: "/account#nickname",
  }).catch(() => undefined);
  return { ok: true as const, from: user.nickname, to };
}

/** 닉네임 변경권 주기(마스터): 1~5장 · 기록 · 알림 */
export async function grantNicknameTickets(
  targetNickname: string,
  count: number,
  actorId: string,
  ip: string,
) {
  const n = Math.max(1, Math.min(5, Math.floor(count)));
  const user = await prisma.user.findFirst({
    where: { nickname: targetNickname },
    select: { id: true, nickname: true, nicknameTickets: true },
  });
  if (!user) return { ok: false as const, error: "회원을 찾을 수 없어요." };
  const row = await prisma.user.update({
    where: { id: user.id },
    data: { nicknameTickets: { increment: n } },
    select: { nicknameTickets: true },
  });
  const { writeAudit } = await import("@/lib/security");
  await writeAudit({
    kind: "nickname_ticket",
    userId: actorId,
    ip,
    detail: `${user.nickname} 닉네임 변경권 +${n}장`,
  }).catch(() => undefined);
  const { notifyUser } = await import("@/lib/push");
  await notifyUser(user.id, {
    title: "닉네임 변경권을 받았어요",
    body: `운영진이 닉네임 변경권 ${n}장을 드렸어요. 내 정보에서 닉네임을 바꿀 수 있어요.`,
    url: "/account#nickname",
  }).catch(() => undefined);
  return { ok: true as const, tickets: row.nicknameTickets, added: n };
}

/** 아직 확인 안 한 강제 변경 안내(가장 최근) */
export async function pendingNickNotice(userId: string) {
  const row = await prisma.toolSaved
    .findFirst({
      where: { ownerId: userId, kind: "nick-forced", name: "pending" },
      orderBy: { createdAt: "desc" },
      select: { dataJson: true },
    })
    .catch(() => null);
  if (!row) return null;
  try {
    const v = JSON.parse(row.dataJson) as {
      from: string;
      to: string;
      reason: ForceReason;
    };
    return {
      from: v.from,
      to: v.to,
      reason: FORCE_REASONS[v.reason] ?? FORCE_REASONS.etc,
    };
  } catch {
    return null;
  }
}

export async function ackNickNotice(userId: string) {
  await prisma.toolSaved
    .updateMany({
      where: { ownerId: userId, kind: "nick-forced", name: "pending" },
      data: { name: "seen" },
    })
    .catch(() => undefined);
}

/** 비속어 · 금지어 필터에 걸리는 지금 닉네임(마스터 · 탈퇴 제외) */
export async function badNicknames(limit = 50) {
  const users = await prisma.user.findMany({
    where: { isMaster: false, withdrawnAt: null },
    select: { nickname: true, level: true },
    take: 20000,
  });
  const [disabled, words] = await Promise.all([loadDisabledBaseWords().catch(() => undefined), loadForbiddenWordsFresh()]);
  const out: { nickname: string; level: number; reason: string }[] = [];
  for (const u of users) {
    const err = nicknameError(u.nickname, disabled) ?? (findForbiddenInNickname(u.nickname, words) ? "금지어가 들어간 닉네임" : null);
    // 길이 · 글자 규칙은 예전 가입자일 수 있어 빼고, 비속어 · 사칭 · 금지어만
    if (err && !err.startsWith("닉네임은"))
      out.push({ nickname: u.nickname, level: u.level, reason: err });
    if (out.length >= limit) break;
  }
  return out;
}
