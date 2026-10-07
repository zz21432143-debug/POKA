import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/current-user";
import { completeEmailVerification } from "@/lib/email-verify";
import { signSessionValue } from "@/lib/session";

export const dynamic = "force-dynamic";

function sessionCookie(nickname: string) {
  return {
    name: SESSION_COOKIE,
    value: signSessionValue(nickname),
    options: {
      path: "/",
      sameSite: "lax" as const,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const token = url.searchParams.get("token") ?? url.searchParams.get("code") ?? "";
  const verified = await completeEmailVerification(email, token);
  if (!verified.ok) {
    const next = new URL("/login", url.origin);
    next.searchParams.set("verify", "fail");
    if (email) next.searchParams.set("email", email);
    return NextResponse.redirect(next);
  }
  const home = new URL("/", url.origin);
  home.searchParams.set("verified", "1");
  const response = NextResponse.redirect(home);
  const cookie = sessionCookie(verified.nickname);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
