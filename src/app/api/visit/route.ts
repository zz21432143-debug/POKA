import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isBotAgent, recordVisit } from "@/lib/site-stats";

const COOKIE = "poka_vid";

/** 방문자 수 집계. 브라우저마다 무작위 ID 쿠키 하나만 쓰고 IP는 저장하지 않습니다. */
export async function POST(request: Request) {
  if (isBotAgent(request.headers.get("user-agent"))) return NextResponse.json({ ok: true, counted: false });
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  const id = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : randomUUID();
  await recordVisit(id).catch(() => undefined);
  const response = NextResponse.json({ ok: true, counted: true });
  if (id !== existing) {
    response.cookies.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return response;
}
