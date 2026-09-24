import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clearSession, setSessionNickname } from "@/lib/current-user";
import { nicknameError, normalizeNickname, passwordError } from "@/lib/nickname";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
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

  const nickname = normalizeNickname(body.nickname ?? "");
  const password = typeof body.password === "string" ? body.password : "";
  const nickErr = nicknameError(nickname);
  const passErr = passwordError(password);

  if (action === "register") {
    if (nickErr) return NextResponse.json({ error: nickErr }, { status: 400 });
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
    const taken = await prisma.user.findUnique({ where: { nickname } });
    if (taken) return NextResponse.json({ error: "이미 있는 닉네임입니다." }, { status: 409 });
    const user = await prisma.user.create({
      data: {
        nickname,
        passwordHash: hashPassword(password),
        level: 1,
        exp: 0,
        points: 0,
      },
    });
    await setSessionNickname(user.nickname);
    return NextResponse.json({ ok: true, nickname: user.nickname });
  }

  if (action === "login") {
    if (!nickname || !password) {
      return NextResponse.json({ error: "닉네임과 비밀번호를 입력하세요." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "닉네임 또는 비밀번호가 맞지 않습니다." }, { status: 401 });
    }
    await setSessionNickname(user.nickname);
    return NextResponse.json({ ok: true, nickname: user.nickname });
  }

  return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
}
