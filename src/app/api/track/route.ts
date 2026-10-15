import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isBotAgent } from "@/lib/site-stats";
import { SOURCE_COOKIE, SOURCE_RE, addTraffic } from "@/lib/traffic";

const MONTH = 60 * 60 * 24 * 30;

/**
 * 유입 경로 한 번 알리기 { src, ref? }(화면이 출처마다 하루 한 번).
 * ref = 초대 코드: 진짜 코드일 때만 30일 쿠키(틀린 코드가 진짜 초대를 막지 않게) · 먼저 받은 초대가 우선.
 * 첫 출처도 30일 기억 → 가입하면 그 출처의 가입으로 셈.
 */
export async function POST(request: Request) {
  if (isBotAgent(request.headers.get("user-agent")))
    return NextResponse.json({ ok: true });
  const body = (await request.json().catch(() => ({}))) as {
    src?: unknown;
    ref?: unknown;
  };
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  let src =
    typeof body.src === "string" ? body.src.toLowerCase().slice(0, 24) : "";
  const ref = typeof body.ref === "string" ? body.ref.toLowerCase() : "";
  if (ref) {
    const { INVITE_COOKIE, codeOwner } = await import("@/lib/invite");
    if (await codeOwner(ref)) {
      src = "invite";
      if (!jar.get(INVITE_COOKIE))
        jar.set(INVITE_COOKIE, ref, {
          maxAge: MONTH,
          httpOnly: true,
          sameSite: "lax",
          secure,
          path: "/",
        });
    }
  }
  if (!SOURCE_RE.test(src)) return NextResponse.json({ ok: true });
  await addTraffic(src, "visits").catch(() => undefined);
  if (!jar.get(SOURCE_COOKIE))
    jar.set(SOURCE_COOKIE, src, {
      maxAge: MONTH,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
    });
  return NextResponse.json({ ok: true });
}
