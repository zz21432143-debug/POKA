import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** 한 게시판에 「중요」로 고정할 수 있는 글 수 */
const PIN_MAX = 3;

/** 「중요」 고정 · 해제(관리자만): { pinned: boolean } */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { pinned?: unknown };
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, boardType: true, pinnedAt: true } });
  if (!post) return NextResponse.json({ error: "글을 찾을 수 없어요." }, { status: 404 });
  if (body.pinned === true && !post.pinnedAt) {
    const count = await prisma.post.count({ where: { boardType: post.boardType, pinnedAt: { not: null }, hidden: false } });
    if (count >= PIN_MAX) return NextResponse.json({ error: `한 게시판에 중요 글은 ${PIN_MAX}개까지예요. 다른 글의 중요 표시를 먼저 풀어 주세요.` }, { status: 409 });
  }
  await prisma.post.update({ where: { id }, data: { pinnedAt: body.pinned === true ? (post.pinnedAt ?? new Date()) : null } });
  return NextResponse.json({ ok: true, pinned: body.pinned === true });
}
