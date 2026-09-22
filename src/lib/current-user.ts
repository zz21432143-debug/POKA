import { prisma } from "@/lib/db";
import { toViewerProfile, type ViewerProfile } from "@/lib/profile";

export type CurrentUser = ViewerProfile & { id: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user =
    (await prisma.user.findFirst({
      where: { isDealerVerified: true },
      orderBy: { level: "desc" },
    })) ?? (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!user) return null;
  const profile = await toViewerProfile(user);
  return { id: user.id, ...profile };
}
