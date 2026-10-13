import { NextRequest, NextResponse } from "next/server";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 다른 사이트에서 보낸 글쓰기·삭제 요청 막기(CSRF 이중 방어).
 * 브라우저가 Origin을 붙인 /api 요청은 우리 주소에서 온 것만 받습니다(Origin이 없으면 쿠키 SameSite=Lax가 막음).
 */
function crossSiteApiWrite(request: NextRequest) {
  if (!UNSAFE_METHODS.has(request.method) || !request.nextUrl.pathname.startsWith("/api/")) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** 보안 헤더. 작성 쿨다운은 API 레이어(`assertWriteCooldown`)에서 처리합니다. */
export function proxy(request: NextRequest) {
  if (crossSiteApiWrite(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");
  // 항상 https로(1년)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|marks/|banners/).*)"],
};
