import { prisma } from "@/lib/db";

export const LAUNCH_EMPTY_KIND = "LAUNCH_EMPTY_COMMUNITY";
export const LAUNCH_MASTER_KIND = "LAUNCH_MASTER_POKA_SPRING";
export const LAUNCH_MASTER_NICKNAME = "POKA";
export const LEGACY_MASTER_NICKNAME = "포카의봄";
export const LAUNCH_MASTER_TICKETS = 10;

export async function wipeCommunityForLaunch() {
  const already = await prisma.auditLog.findFirst({
    where: { kind: LAUNCH_EMPTY_KIND },
    select: { id: true },
  });
  if (already) return { wiped: false };

  const kakaoMembers = await prisma.user.count({ where: { kakaoId: { not: null } } });
  if (kakaoMembers > 0) {
    await prisma.auditLog.create({
      data: {
        kind: LAUNCH_EMPTY_KIND,
        ip: "system",
        detail: "skipped wipe: kakao members already exist",
      },
    });
    return { wiped: false };
  }

  await prisma.bannerSlot.updateMany({ data: { postId: null } });
  await prisma.handPollVote.deleteMany();
  await prisma.commentVote.deleteMany();
  await prisma.postVote.deleteMany();
  await prisma.report.deleteMany();
  await prisma.dailyAttendance.deleteMany();
  await prisma.dealerDrillRun.deleteMany();
  await prisma.userMark.deleteMany();
  await prisma.userCosmetic.deleteMany();
  await prisma.writeThrottle.deleteMany();
  await prisma.tickerEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.updateMany({
    data: { equippedMarkId: null, equippedFrameId: null, equippedEffectId: null },
  });
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auditLog.create({
    data: {
      kind: LAUNCH_EMPTY_KIND,
      ip: "system",
      detail: "launch: no members, no posts; master will be a Kakao login",
    },
  });
  console.log("ensure-db: wiped users and posts for launch");
  return { wiped: true };
}

async function renameLegacyMasterNick() {
  const spring = await prisma.user.findFirst({
    where: { nickname: { equals: LEGACY_MASTER_NICKNAME, mode: "insensitive" } },
  });
  if (!spring) return;
  const taken = await prisma.user.findFirst({
    where: { nickname: { equals: LAUNCH_MASTER_NICKNAME, mode: "insensitive" }, NOT: { id: spring.id } },
  });
  if (taken) {
    if (taken.kakaoId || taken.googleId) return;
    await prisma.user.update({
      where: { id: taken.id },
      data: { nickname: `old_${taken.id.slice(-10)}` },
    });
  }
  await prisma.user.update({
    where: { id: spring.id },
    data: {
      nickname: LAUNCH_MASTER_NICKNAME,
      isMaster: true,
      isAdmin: true,
      role: "MASTER",
      level: 250,
      exp: 24900,
    },
  });
}

export async function promoteMasterNickname(nickname: string) {
  const name = nickname.trim();
  if (!name) return null;
  const user = await prisma.user.findFirst({
    where: { nickname: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return null;
  await prisma.user.updateMany({
    where: { isMaster: true },
    data: { isMaster: false, isAdmin: false, role: "USER" },
  });
  return prisma.user.update({
    where: { id: user.id },
    data: {
      isMaster: true,
      isAdmin: true,
      role: "MASTER",
      level: 250,
      exp: 24900,
    },
  });
}

export async function ensureLaunchMaster() {
  await renameLegacyMasterNick();
  const already = await prisma.auditLog.findFirst({
    where: { kind: LAUNCH_MASTER_KIND },
    select: { id: true },
  });
  if (already) {
    const current = await prisma.user.findFirst({
      where: { nickname: { equals: LAUNCH_MASTER_NICKNAME, mode: "insensitive" } },
    });
    if (current && !current.isMaster) {
      return prisma.user.update({
        where: { id: current.id },
        data: { isMaster: true, isAdmin: true, role: "MASTER", level: 250, exp: 24900 },
      });
    }
    return current;
  }
  const nickname = process.env.MASTER_PROMOTE_NICKNAME?.trim() || LAUNCH_MASTER_NICKNAME;
  const user = await promoteMasterNickname(nickname);
  if (!user) return null;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { nicknameTickets: { increment: LAUNCH_MASTER_TICKETS } },
  });
  await prisma.auditLog.create({
    data: {
      kind: LAUNCH_MASTER_KIND,
      userId: updated.id,
      ip: "system",
      detail: `${updated.nickname}: master + ${LAUNCH_MASTER_TICKETS} nickname tickets`,
    },
  });
  return updated;
}
