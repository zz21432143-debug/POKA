import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireMaster } from "@/lib/admin";
import { normalizeNickname } from "@/lib/nickname";

export async function POST(request: Request) {
  const { error } = await requireMaster();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    nickname?: string;
    verified?: boolean;
  } | null;
  const nickname = normalizeNickname(body?.nickname ?? "");
  if (!nickname || typeof body?.verified !== "boolean") {
    return NextResponse.json({ error: "닉네임과 인증 여부를 확인하세요." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { nickname },
    select: { id: true, nickname: true, isMaster: true },
  });
  if (!target) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }
  if (target.isMaster) {
    return NextResponse.json({ error: "마스터 계정에는 인증 마크를 달지 않습니다." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { isDealerVerified: body.verified },
    select: { nickname: true, isDealerVerified: true },
  });
  return NextResponse.json({ ok: true, nickname: updated.nickname, verified: updated.isDealerVerified });
}
