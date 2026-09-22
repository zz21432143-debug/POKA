import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { toViewerProfile, type ViewerProfile } from "@/lib/profile";
import type { SwitchAccount } from "@/lib/switch-account";

export type { SwitchAccount };
export type CurrentUser = ViewerProfile & { id: string };
export const SESSION_COOKIE = "poka_user";

async function findUserBySession() {
  const jar = await cookies();
  const nickname = jar.get(SESSION_COOKIE)?.value;
  if (nickname) {
    const named = await prisma.user.findUnique({ where: { nickname } });
    if (named) return named;
  }
  return (
    (await prisma.user.findFirst({
      where: { isDealerVerified: true },
      orderBy: { level: "desc" },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }))
  );
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = await findUserBySession();
  if (!user) return null;
  const profile = await toViewerProfile(user);
  return { id: user.id, ...profile };
}

export async function listSwitchableUsers(): Promise<SwitchAccount[]> {
  return prisma.user.findMany({
    orderBy: [{ isAdmin: "desc" }, { isDealerVerified: "desc" }, { level: "desc" }, { nickname: "asc" }],
    take: 12,
    select: {
      nickname: true,
      level: true,
      isAdmin: true,
      isDealerVerified: true,
      points: true,
    },
  });
}
