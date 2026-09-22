import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const mark = await prisma.mark.findUnique({ where: { id } });
    if (!mark) {
      return NextResponse.json({ error: "마크를 찾을 수 없습니다." }, { status: 404 });
    }
    if (user.level < mark.minLevel) {
      return NextResponse.json({ error: `레벨 ${mark.minLevel}부터 구매할 수 있습니다.` }, { status: 400 });
    }
    const owned = await prisma.userMark.findUnique({
      where: { userId_markId: { userId: user.id, markId: id } },
    });
    if (owned) {
      return NextResponse.json({ error: "이미 보유한 마크입니다." }, { status: 409 });
    }
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || fresh.points < mark.pricePoints) {
      return NextResponse.json({ error: "포인트가 부족합니다." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { points: { decrement: mark.pricePoints } },
      }),
      prisma.userMark.create({ data: { userId: user.id, markId: id } }),
    ]);

    const { pushTicker } = await import("@/lib/ticker");
    await pushTicker({
      kind: `MARK:${user.id}:${mark.id}`,
      message: `🎰 ${user.nickname}님이 마크 상점에서 [${mark.name}]를 구매하셨습니다!`,
      href: "/shop",
    });

    return NextResponse.json({ ok: true, spent: mark.pricePoints });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구매에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
