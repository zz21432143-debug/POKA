import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { publicErrorMessage } from "@/lib/public-error";

/** 구인구직 프리미엄(상단 고정) 켜기·끄기. 결제 연동 전까지 운영진이 직접 지정합니다. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || !isStaff(user)) {
      return NextResponse.json({ error: "운영진만 지정할 수 있습니다." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { isPaid?: unknown };
    if (typeof body.isPaid !== "boolean") {
      return NextResponse.json({ error: "isPaid 값을 확인하세요." }, { status: 400 });
    }
    const post = await prisma.post.findUnique({ where: { id }, select: { boardType: true } });
    if (!post || post.boardType !== "JOBS") {
      return NextResponse.json({ error: "구인·구직 글이 아닙니다." }, { status: 404 });
    }
    await prisma.post.update({ where: { id }, data: { isPaid: body.isPaid } });
    return NextResponse.json({ ok: true, isPaid: body.isPaid });
  } catch (error) {
    const message = publicErrorMessage(error, "처리에 실패했습니다.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
