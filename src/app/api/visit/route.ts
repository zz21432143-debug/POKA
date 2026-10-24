import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deviceOf, isBotAgent, recordVisit } from "@/lib/site-stats";
import { addTraffic } from "@/lib/traffic";

const COOKIE = "poka_vid";

/** 방문자 수 집계. 브라우저마다 무작위 ID 쿠키 하나만 쓰고 IP는 저장하지 않습니다. */
export async function POST(request: Request) {
  if (isBotAgent(request.headers.get("user-agent"))) return NextResponse.json({ ok: true, counted: false });
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  const id = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : randomUUID();
  const fresh = await recordVisit(id).catch(() => false);
  // 기기 비율: 그날 처음 온 방문자만(유입 경로 표에서는 「x-」 칸이라 빠짐)
  if (fresh) await addTraffic(`x-dev-${deviceOf(request.headers.get("user-agent"))}`, "visits").catch(() => undefined);
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
