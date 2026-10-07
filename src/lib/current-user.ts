import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { toViewerProfile, type ViewerProfile } from "@/lib/profile";
import { CONSENT_COOKIE, GOOGLE_STATE_COOKIE, OAUTH_NEXT_COOKIE } from "@/lib/oauth-consent";
import { readSessionValue, signSessionValue } from "@/lib/session";
import type { SwitchAccount } from "@/lib/switch-account";

export type { SwitchAccount };
export type CurrentUser = ViewerProfile & { id: string };
export const SESSION_COOKIE = "poka_user";
export const KAKAO_STATE_COOKIE = "poka_kakao_state";

const COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

export async function setSessionNickname(nickname: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSessionValue(nickname), COOKIE_OPTS);
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(KAKAO_STATE_COOKIE);
  jar.delete(GOOGLE_STATE_COOKIE);
  jar.delete(CONSENT_COOKIE);
  jar.delete(OAUTH_NEXT_COOKIE);
}

async function findUserBySession() {
  const jar = await cookies();
  const nickname = readSessionValue(jar.get(SESSION_COOKIE)?.value);
  if (!nickname) return null;
  return prisma.user.findUnique({ where: { nickname } });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const user = await findUserBySession();
  if (!user) return null;
  const profile = await toViewerProfile(user);
  return { id: user.id, ...profile };
}

export async function listSwitchableUsers(): Promise<SwitchAccount[]> {
  return prisma.user.findMany({
    orderBy: [
      { isMaster: "desc" },
      { isAdmin: "desc" },
      { isDealerVerified: "desc" },
      { level: "desc" },
      { nickname: "asc" },
    ],
    take: 12,
    select: {
      nickname: true,
      level: true,
      isAdmin: true,
      isMaster: true,
      isDealerVerified: true,
      points: true,
    },
  });
}
