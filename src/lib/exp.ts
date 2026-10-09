import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { levelFromExp } from "@/lib/levels";
import { DAILY_POINT_CAP } from "@/lib/rewards";

export async function grantRewards(
  userId: string,
  exp: number,
  points: number,
  options?: { ignorePointCap?: boolean },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("회원을 찾을 수 없습니다.");
  }

  const today = todayKstDate();
  const earnedToday = user.pointsEarnedDate === today ? user.pointsEarnedToday : 0;
  const room = Math.max(0, DAILY_POINT_CAP - earnedToday);
  const grantedPoints = options?.ignorePointCap
    ? Math.max(0, points)
    : Math.max(0, Math.min(points, room));
  const newExp = user.exp + Math.max(0, exp);
  const level = levelFromExp(newExp);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      exp: newExp,
      points: user.points + grantedPoints,
      level,
      pointsEarnedDate: today,
      pointsEarnedToday: options?.ignorePointCap ? earnedToday : earnedToday + grantedPoints,
    },
  });

  if (grantedPoints > 0) {
    const { recordPointGain } = await import("@/lib/point-ledger");
    await recordPointGain(userId, grantedPoints, "reward").catch(() => undefined);
  }

  if (level > user.level) {
    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `LEVEL:${userId}:${level}`,
      message: `🎉 ${user.nickname}님이 Lv.${level}을 달성하셨습니다!`,
      href: `/u/${encodeURIComponent(user.nickname)}`,
    });
  }

  if (level >= 200) {
    const { grantLevelRewardMarks } = await import("@/lib/grant-reward-marks");
    await grantLevelRewardMarks(userId, level).catch(() => undefined);
  }

  return { user: updated, grantedPoints, grantedExp: Math.max(0, exp) };
}
