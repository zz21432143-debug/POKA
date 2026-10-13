import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { toViewerProfile, type ViewerProfile } from "@/lib/profile";
import {
  CONSENT_COOKIE,
  GOOGLE_STATE_COOKIE,
  OAUTH_INTENT_COOKIE,
  OAUTH_NEXT_COOKIE,
} from "@/lib/oauth-consent";
import { makeSessionToken, parseSessionToken } from "@/lib/session";
import { liftExpiredSuspension } from "@/lib/account-restriction";
import { roleFromFlags } from "@/lib/roles";

export type CurrentUser = ViewerProfile & {
  id: string;
  email: string | null;
  nicknameChangeCount: number;
  nicknameTickets: number;
  role: "USER" | "ADMIN" | "MASTER";
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  suspendedUntil: Date | null;
  banReason: string | null;
};
export const SESSION_COOKIE = "poka_user";
export const KAKAO_STATE_COOKIE = "poka_kakao_state";

const COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

/** 로그인 쿠키 발급(회원 id · 쿠키 버전) */
export async function setSessionUser(user: { id: string; sessionVersion: number }) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeSessionToken(user.id, user.sessionVersion), COOKIE_OPTS);
}

export async function clearSession() {
  const jar = await cookies();
  const expire = { ...COOKIE_OPTS, maxAge: 0 };
  jar.set(SESSION_COOKIE, "", expire);
  jar.set(KAKAO_STATE_COOKIE, "", expire);
  jar.set(GOOGLE_STATE_COOKIE, "", expire);
  jar.set(CONSENT_COOKIE, "", expire);
  jar.set(OAUTH_NEXT_COOKIE, "", expire);
  jar.set(OAUTH_INTENT_COOKIE, "", expire);
}

async function findUserBySession() {
  const jar = await cookies();
  const session = parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  // 모든 기기 로그아웃 · 탈퇴로 버전이 바뀌었으면 예전 쿠키는 무효
  return user && user.sessionVersion === session.version ? user : null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const user = await findUserBySession();
    if (!user || user.withdrawnAt) return null;
    const lifted = await liftExpiredSuspension({
      id: user.id,
      status: user.status,
      suspendedUntil: user.suspendedUntil,
      banReason: user.banReason,
    });
    const status = (lifted.status ?? "ACTIVE") as CurrentUser["status"];
    return {
      id: user.id,
      email: user.email ?? null,
      nicknameChangeCount: user.nicknameChangeCount ?? 0,
      nicknameTickets: user.nicknameTickets ?? 0,
      ...toViewerProfile(user),
      role: roleFromFlags(user),
      status,
      suspendedUntil: lifted.suspendedUntil ? new Date(lifted.suspendedUntil) : null,
      banReason: lifted.banReason ?? null,
    };
  } catch {
    return null;
  }
});

