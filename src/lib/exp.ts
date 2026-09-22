import { prisma } from "@/lib/db";

export async function grantRewards(userId: string, exp: number, points: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("회원을 찾을 수 없습니다.");
  }

  const newExp = user.exp + exp;
  const levels = await prisma.levelExp.findMany({ orderBy: { level: "asc" } });
  let level = user.level;
  while (true) {
    const next = levels.find((row) => row.level === level + 1);
    if (!next || newExp < next.requiredExp) break;
    level = next.level;
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      exp: newExp,
      points: user.points + points,
      level,
    },
  });
}
