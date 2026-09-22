import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? "";
    if (reason.length < 2) {
      return NextResponse.json({ error: "신고 사유를 입력하세요." }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (post.boardType !== "ANONYMOUS_REVIEW") {
      return NextResponse.json({ error: "매장후기만 신고할 수 있습니다." }, { status: 400 });
    }
    if (post.authorId === user.id) {
      return NextResponse.json({ error: "내 글은 신고할 수 없습니다." }, { status: 400 });
    }

    try {
      await prisma.report.create({
        data: { postId: id, reporterId: user.id, reason },
      });
    } catch {
      return NextResponse.json({ error: "이미 신고한 글입니다." }, { status: 409 });
    }

    const count = await prisma.report.count({ where: { postId: id } });
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "신고에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
