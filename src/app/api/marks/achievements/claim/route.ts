import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ensureYokaiMarks } from "@/lib/ensure-yokai-marks";
import { achievementBySlug } from "@/lib/yokai-achievements";
import { YOKAI_MARKS } from "@/lib/yokai-marks";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const body = (await request.json()) as { slug?: string };
    const def = achievementBySlug(body.slug ?? "");
    if (!def) {
      return NextResponse.json({ error: "업적 마크를 찾을 수 없습니다." }, { status: 404 });
    }
    await ensureYokaiMarks();
    const mark = await prisma.mark.findUnique({ where: { slug: def.slug } });
    if (!mark) {
      return NextResponse.json({ error: "업적 마크를 아직 준비하지 못했습니다." }, { status: 404 });
    }
    const owned = await prisma.userMark.findUnique({
      where: { userId_markId: { userId: user.id, markId: mark.id } },
    });
    if (owned) {
      return NextResponse.json({ error: "이미 받은 업적 마크입니다." }, { status: 409 });
    }
    const collected = await prisma.userMark.count({
      where: { userId: user.id, mark: { slug: { in: YOKAI_MARKS.map((row) => row.slug) } } },
    });
    if (collected < def.required) {
      return NextResponse.json(
        { error: `요괴 마크 ${def.required}종을 모으면 받을 수 있습니다. 현재 ${collected}종입니다.` },
        { status: 400 },
      );
    }
    await prisma.userMark.create({ data: { userId: user.id, markId: mark.id } });
    return NextResponse.json({ ok: true, collected });
  } catch (error) {
    const message = error instanceof Error ? error.message : "보상을 받지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
