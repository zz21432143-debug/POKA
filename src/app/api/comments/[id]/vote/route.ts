import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

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
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { author: { select: { nickname: true } } },
    });
    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
    }
    if (comment.authorId === user.id) {
      return NextResponse.json({ error: "내 댓글은 추천할 수 없습니다." }, { status: 400 });
    }

    const existing = await prisma.commentVote.findUnique({
      where: { commentId_userId: { commentId: id, userId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ upvoteCount: comment.upvoteCount, liked: true });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.commentVote.create({ data: { commentId: id, userId: user.id } });
      return tx.comment.update({
        where: { id },
        data: { upvoteCount: { increment: 1 } },
      });
    });

    return NextResponse.json({ upvoteCount: updated.upvoteCount, liked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "추천에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
