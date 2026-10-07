import { prisma } from "@/lib/db";
import { todayKstDate } from "@/lib/dates";
import { levelFromExp } from "@/lib/levels";
import { DAILY_POINT_CAP } from "@/lib/rewards";

export async function grantRewards(userId: string, exp: number, points: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("회원을 찾을 수 없습니다.");
  }

  const today = todayKstDate();
  const earnedToday = user.pointsEarnedDate === today ? user.pointsEarnedToday : 0;
  const room = Math.max(0, DAILY_POINT_CAP - earnedToday);
  const grantedPoints = Math.max(0, Math.min(points, room));
  const newExp = user.exp + Math.max(0, exp);
  const level = levelFromExp(newExp);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      exp: newExp,
      points: user.points + grantedPoints,
      level,
      pointsEarnedDate: today,
      pointsEarnedToday: earnedToday + grantedPoints,
    },
  });

  if (level > user.level) {
    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `LEVEL:${userId}:${level}`,
      message: `🎉 ${user.nickname}님이 Lv.${level}을 달성하셨습니다!`,
      href: `/u/${encodeURIComponent(user.nickname)}`,
    });
  }

  return updated;
}
