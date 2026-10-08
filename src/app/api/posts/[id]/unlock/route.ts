import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { unlockPasswordOk } from "@/lib/private-post";
import { UNLOCK_COOKIE, UNLOCK_COOKIE_OPTS, packUnlocks, parseUnlocks } from "@/lib/unlock-cookie";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인된 회원이 없습니다." }, { status: 401 });
  }
  const { id } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { id: true, isPrivate: true, unlockPasswordHash: true, authorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!post.isPrivate) {
    return NextResponse.json({ ok: true });
  }
  if (user.isAdmin || post.authorId === user.id) {
    return NextResponse.json({ ok: true });
  }
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!unlockPasswordOk(body.password ?? "", post.unlockPasswordHash)) {
    return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 403 });
  }
  const jar = await cookies();
  const next = [...parseUnlocks(jar.get(UNLOCK_COOKIE)?.value), post.id];
  jar.set(UNLOCK_COOKIE, packUnlocks(next), UNLOCK_COOKIE_OPTS);
  return NextResponse.json({ ok: true });
}
