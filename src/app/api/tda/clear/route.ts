import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";

/**
 * TDA 룰 게시판 글 모두 삭제(숨김). 마스터(POKA 공식 계정)만, 확인 문구 "전체 삭제"를 보내야 합니다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  if (!canWriteBoard(user, "TDA")) {
    return NextResponse.json({ error: writeDeniedMessage("TDA") }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "전체 삭제") {
    return NextResponse.json({ error: "확인 문구가 맞지 않습니다." }, { status: 400 });
  }
  const result = await prisma.post.updateMany({ where: { boardType: "TDA", hidden: false }, data: { hidden: true } });
  return NextResponse.json({ ok: true, count: result.count });
}
