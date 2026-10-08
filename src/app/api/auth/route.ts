import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearSession, setSessionNickname } from "@/lib/current-user";
import { normalizeNickname } from "@/lib/nickname";
import { verifyPassword } from "@/lib/password";
import { AccountRestrictedError, assertAccountActive } from "@/lib/account-restriction";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      nickname?: string;
      password?: string;
    };
    const action = body.action;
    if (action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    if (action === "login") {
      const nickname = normalizeNickname(body.nickname ?? "");
      const password = typeof body.password === "string" ? body.password : "";
      if (!nickname || !password) {
        return NextResponse.json({ error: "닉네임과 비밀번호를 입력하세요." }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user || user.withdrawnAt || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "닉네임 또는 비밀번호가 맞지 않습니다." }, { status: 401 });
      }
      try {
        await assertAccountActive(user);
      } catch (error) {
        if (error instanceof AccountRestrictedError) {
          return NextResponse.json({ error: error.message }, { status: 403 });
        }
        throw error;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await setSessionNickname(user.nickname);
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "처리할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
