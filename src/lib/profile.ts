import { prisma } from "@/lib/db";

export type ViewerProfile = {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  exp: number;
  points: number;
  isDealerVerified: boolean;
  currentLevelExp: number;
  nextLevelExp: number | null;
  progressPercent: number;
};

export async function getViewerProfile(): Promise<ViewerProfile | null> {
  const user =
    (await prisma.user.findFirst({
      where: { isDealerVerified: true },
      orderBy: { level: "desc" },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!user) return null;
  return toViewerProfile(user);
}

async function toViewerProfile(user: {
  nickname: string;
  profileMarkImageUrl: string | null;
  level: number;
  exp: number;
  points: number;
  isDealerVerified: boolean;
}): Promise<ViewerProfile> {
  const [current, next] = await Promise.all([
    prisma.levelExp.findUnique({ where: { level: user.level } }),
    prisma.levelExp.findUnique({ where: { level: user.level + 1 } }),
  ]);
  const currentLevelExp = current?.requiredExp ?? 0;
  const nextLevelExp = next?.requiredExp ?? null;
  const span = nextLevelExp == null ? 1 : Math.max(nextLevelExp - currentLevelExp, 1);
  const gained = Math.max(user.exp - currentLevelExp, 0);
  const progressPercent =
    nextLevelExp == null ? 100 : Math.min(100, Math.round((gained / span) * 100));

  return {
    nickname: user.nickname,
    profileMarkImageUrl: user.profileMarkImageUrl,
    level: user.level,
    exp: user.exp,
    points: user.points,
    isDealerVerified: user.isDealerVerified,
    currentLevelExp,
    nextLevelExp,
    progressPercent,
  };
}
