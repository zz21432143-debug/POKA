import { NextResponse } from "next/server";

/** 보안 헤더. 작성 쿨다운은 SQLite 상태 때문에 API 레이어(`assertWriteCooldown`)에서 처리합니다. */
export function proxy() {
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marks/|banners/).*)"],
};
