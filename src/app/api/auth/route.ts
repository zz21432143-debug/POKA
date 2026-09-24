import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { clearSession, setSessionNickname } from "@/lib/current-user";
import { nicknameError, normalizeNickname, passwordError } from "@/lib/nickname";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertWriteCooldown } from "@/lib/security";
import { pushTicker } from "@/lib/ticker";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action?: string;
      nickname?: string;
      password?: string;
      newPassword?: string;
      code?: string;
      company?: string;
    };
    const action = body.action;
    if (action === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true });
    }

    const nickname = normalizeNickname(body.nickname ?? "");
    const password = typeof body.password === "string" ? body.password : "";

    if (action === "register") {
      if (body.company?.trim()) {
        return NextResponse.json({ error: "가입할 수 없습니다." }, { status: 400 });
      }
      const nickErr = nicknameError(nickname);
      const passErr = passwordError(password);
      if (nickErr) return NextResponse.json({ error: nickErr }, { status: 400 });
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
      await assertWriteCooldown({ kind: "register", ip: clientIp(request) });
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
      await pushTicker({
        kind: `JOIN:${user.id}`,
        message: `👋 ${user.nickname}님이 POKA에 가입했습니다!`,
        href: `/u/${encodeURIComponent(user.nickname)}`,
      });
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    if (action === "login") {
      if (!nickname || !password) {
        return NextResponse.json({ error: "닉네임과 비밀번호를 입력하세요." }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: "닉네임 또는 비밀번호가 맞지 않습니다." }, { status: 401 });
      }
      await setSessionNickname(user.nickname);
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    if (action === "forgot") {
      if (!nickname) return NextResponse.json({ error: "닉네임을 입력하세요." }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
      if (!user.passwordHash && user.kakaoId) {
        return NextResponse.json({ error: "카카오로 가입한 계정은 카카오 버튼을 이용하세요." }, { status: 400 });
      }
      const code = String(randomInt(100000, 1000000));
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetCodeHash: hashPassword(code),
          resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      return NextResponse.json({
        ok: true,
        code,
        hint: "메일 연동이 없어 재설정 코드를 이 화면에만 보여 줍니다. 15분 안에 새 비밀번호를 정하세요.",
      });
    }

    if (action === "reset") {
      const next = typeof body.newPassword === "string" ? body.newPassword : "";
      const code = typeof body.code === "string" ? body.code.trim() : "";
      const passErr = passwordError(next);
      if (!nickname || !code) return NextResponse.json({ error: "닉네임과 코드를 입력하세요." }, { status: 400 });
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { nickname } });
      if (!user?.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
        return NextResponse.json({ error: "재설정 코드가 만료되었습니다." }, { status: 400 });
      }
      if (!verifyPassword(code, user.resetCodeHash)) {
        return NextResponse.json({ error: "코드가 맞지 않습니다." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(next), resetCodeHash: null, resetCodeExpires: null },
      });
      await setSessionNickname(user.nickname);
      return NextResponse.json({ ok: true, nickname: user.nickname });
    }

    return NextResponse.json({ error: "요청을 확인하세요." }, { status: 400 });
  } catch (error) {
    if (error instanceof CoolDownError) {
      return NextResponse.json(
        { error: error.message },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSec) } },
      );
    }
    const message = error instanceof Error ? error.message : "처리할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
