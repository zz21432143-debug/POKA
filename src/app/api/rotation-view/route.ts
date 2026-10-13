import { NextResponse } from "next/server";
import { loadShared, sharedVersion } from "@/lib/rotation-server";

export const dynamic = "force-dynamic";

/**
 * 보기 전용 교대표(로그인 없이). ?t=공유 링크 값, ?v=번호를 주면 바뀐 게 없을 때 짧게 답합니다.
 * 공유를 끄면(값이 없으면) 404.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("t") ?? "";
  const known = Number(params.get("v"));
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  if (Number.isFinite(known) && known > 0) {
    const version = await sharedVersion(token);
    if (version < 0) return NextResponse.json({ error: "공유가 꺼졌습니다." }, { status: 404, headers });
    if (version === known) return NextResponse.json({ changed: false }, { headers });
  }
  const state = await loadShared(token);
  if (!state) return NextResponse.json({ error: "공유가 꺼졌습니다." }, { status: 404, headers });
  return NextResponse.json({ changed: true, state }, { headers });
}
