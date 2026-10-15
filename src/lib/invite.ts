import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

/**
 * 친구 초대: 회원마다 초대 코드(6자) → 초대 링크 `/?ref=코드`.
 * 링크로 들어오면 proxy가 쿠키(poka_ref, 30일)에 코드를 담고, 가입할 때 「누가 초대했는지」를 기록합니다.
 * 초대받은 친구가 첫 출석을 하면 두 사람 모두 포인트(가입만 하고 떠나는 계정으로 포인트를 못 모으게).
 *
 * 저장(ToolSaved, 새 표 없음):
 * - 코드: id `invcode_코드` · ownerId 회원 · kind "invite-code"
 * - 초대: id `invited_새회원id`(한 사람은 한 번만 초대받음) · ownerId 초대한 회원 · kind "invite" · name pending | done | capped | same-ip
 */
export const INVITE_COOKIE = "poka_ref";
export const INVITE_CODE_RE = /^[a-z0-9]{6}$/;
/** 초대한 사람 · 초대받은 사람이 받는 것(친구 첫 출석 때) */
import {
  INVITE_MONTHLY_CAP,
  INVITEE_POINTS,
  INVITER_EXP,
  INVITER_POINTS,
} from "@/lib/invite-config";
export { INVITE_MONTHLY_CAP, INVITEE_POINTS, INVITER_EXP, INVITER_POINTS };

// 헷갈리는 글자(0 o 1 l i) 뺌
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** 내 초대 코드(없으면 만들어 저장) */
export async function myInviteCode(userId: string): Promise<string> {
  const found = await prisma.toolSaved.findFirst({
    where: { ownerId: userId, kind: "invite-code" },
    select: { name: true },
  });
  if (found) return found.name;
  for (let i = 0; i < 5; i += 1) {
    const code = Array.from(
      { length: 6 },
      () => ALPHABET[randomInt(ALPHABET.length)],
    ).join("");
    const made = await prisma.toolSaved
      .createMany({
        data: [
          {
            id: `invcode_${code}`,
            ownerId: userId,
            kind: "invite-code",
            name: code,
            dataJson: "{}",
          },
        ],
        skipDuplicates: true,
      })
      .catch(() => ({ count: 0 }));
    if (made.count === 1) {
      // 동시에 두 번 만들었으면 먼저 만든 것을 씀
      const first = await prisma.toolSaved.findFirst({
        where: { ownerId: userId, kind: "invite-code" },
        orderBy: { createdAt: "asc" },
        select: { name: true },
      });
      return first?.name ?? code;
    }
  }
  throw new Error("초대 코드를 만들지 못했어요.");
}

async function codeOwner(code: string) {
  if (!INVITE_CODE_RE.test(code)) return null;
  const row = await prisma.toolSaved
    .findUnique({
      where: { id: `invcode_${code}` },
      select: { ownerId: true, kind: true },
    })
    .catch(() => null);
  return row?.kind === "invite-code" ? row.ownerId : null;
}

/** 가입 직후: 초대 코드가 있으면 「누가 초대했는지」 기록(자기 자신 · 탈퇴 회원 · 같은 IP는 보상 없음) */
export async function recordInvite(
  newUserId: string,
  code: string | undefined,
  signupIp: string | null,
) {
  if (!code) return;
  const inviterId = await codeOwner(code.toLowerCase());
  if (!inviterId || inviterId === newUserId) return;
  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { withdrawnAt: true, signupIp: true },
  });
  if (!inviter || inviter.withdrawnAt) return;
  const sameIp = Boolean(
    signupIp && inviter.signupIp && signupIp === inviter.signupIp,
  );
  await prisma.toolSaved
    .createMany({
      data: [
        {
          id: `invited_${newUserId}`,
          ownerId: inviterId,
          kind: "invite",
          name: sameIp ? "same-ip" : "pending",
          dataJson: JSON.stringify({ code }),
        },
      ],
      skipDuplicates: true,
    })
    .catch(() => undefined);
}

/** 나를 초대한 사람 닉네임(가입 환영 화면) · 보상 받을 수 있는 상태인지 */
export async function myInviter(userId: string) {
  const row = await prisma.toolSaved
    .findUnique({
      where: { id: `invited_${userId}` },
      select: { ownerId: true, name: true, kind: true },
    })
    .catch(() => null);
  if (!row || row.kind !== "invite") return null;
  const user = await prisma.user
    .findUnique({
      where: { id: row.ownerId },
      select: { nickname: true, withdrawnAt: true },
    })
    .catch(() => null);
  if (!user || user.withdrawnAt) return null;
  return { nickname: user.nickname, status: row.name };
}

/**
 * 첫 출석 때: 초대받은 회원이면 두 사람에게 보상(한 번만 · 원자적으로 pending → done).
 * 초대한 사람이 30일에 10명 넘게 받았으면 친구만 받고 초대한 사람은 capped.
 */
export async function settleInvite(
  userId: string,
): Promise<{ inviter: string; points: number } | null> {
  const row = await prisma.toolSaved
    .findUnique({
      where: { id: `invited_${userId}` },
      select: { ownerId: true, name: true },
    })
    .catch(() => null);
  if (!row || row.name !== "pending") return null;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = await prisma.toolSaved.count({
    where: {
      ownerId: row.ownerId,
      kind: "invite",
      name: "done",
      updatedAt: { gte: since },
    },
  });
  const next = recent >= INVITE_MONTHLY_CAP ? "capped" : "done";
  const claimed = await prisma.toolSaved.updateMany({
    where: { id: `invited_${userId}`, name: "pending" },
    data: { name: next },
  });
  if (claimed.count !== 1) return null;
  const { grantRewards } = await import("@/lib/exp");
  await grantRewards(userId, 0, INVITEE_POINTS, { ignorePointCap: true }).catch(
    () => undefined,
  );
  const inviter = await prisma.user.findUnique({
    where: { id: row.ownerId },
    select: { nickname: true, withdrawnAt: true },
  });
  if (next === "done" && inviter && !inviter.withdrawnAt) {
    await grantRewards(row.ownerId, INVITER_EXP, INVITER_POINTS, {
      ignorePointCap: true,
    }).catch(() => undefined);
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true },
    });
    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `INVITE:${userId}`,
      message: `🤝 ${inviter.nickname}님이 초대한 ${me?.nickname ?? "새 회원"}님이 첫 출석! 둘 다 포인트 선물`,
      href: "/invite",
    }).catch(() => undefined);
  }
  return { inviter: inviter?.nickname ?? "", points: INVITEE_POINTS };
}

/** 초대 화면: 내가 초대한 친구 수(출석 전 · 보상 받음) */
export async function inviteStats(userId: string) {
  const rows = await prisma.toolSaved
    .groupBy({
      by: ["name"],
      where: { ownerId: userId, kind: "invite" },
      _count: { _all: true },
    })
    .catch(() => []);
  const n = (name: string) =>
    rows.find((r) => r.name === name)?._count._all ?? 0;
  return {
    pending: n("pending"),
    done: n("done"),
    capped: n("capped"),
    earned: n("done") * INVITER_POINTS,
  };
}
