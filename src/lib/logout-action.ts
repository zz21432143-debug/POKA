"use server";

import { clearSession, getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { replaceTo } from "@/lib/history-redirect";

export async function logoutAction() {
  await clearSession();
  replaceTo("/");
}

/** 모든 기기에서 로그아웃: 쿠키 버전을 올려 다른 기기의 로그인까지 풉니다. */
export async function logoutAllAction() {
  const user = await getCurrentUser().catch(() => null);
  if (user) await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  await clearSession();
  replaceTo("/");
}
