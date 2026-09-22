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
    const owned = await prisma.userMark.findUnique({
      where: { userId_markId: { userId: user.id, markId: id } },
      include: { mark: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "보유하지 않은 마크입니다. 먼저 구매하세요." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        equippedMarkId: owned.markId,
        profileMarkImageUrl: owned.mark.imageUrl,
      },
    });

    return NextResponse.json({ ok: true, imageUrl: owned.mark.imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "착용에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
