import { prisma } from "@/lib/db";

export const LAUNCH_EMPTY_KIND = "LAUNCH_EMPTY_COMMUNITY";

export async function wipeCommunityForLaunch() {
  const already = await prisma.auditLog.findFirst({
    where: { kind: LAUNCH_EMPTY_KIND },
    select: { id: true },
  });
  if (already) return { wiped: false };

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

export async function promoteMasterNickname(nickname: string) {
  const name = nickname.trim();
  if (!name) return null;
  const user = await prisma.user.findUnique({ where: { nickname: name }, select: { id: true } });
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
