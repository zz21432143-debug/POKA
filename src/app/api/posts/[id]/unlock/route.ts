import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { unlockPasswordOk } from "@/lib/private-post";
import { clientIp } from "@/lib/request";
import { CoolDownError, assertAttemptLimit, writeAudit } from "@/lib/security";
import { UNLOCK_COOKIE, UNLOCK_COOKIE_OPTS, packUnlocks, parseUnlocks } from "@/lib/unlock-cookie";

/** 비밀번호 틀림: 한 글에 회원마다 1시간에 10번까지 */
const UNLOCK_FAIL_MAX = 10;
const UNLOCK_FAIL_WINDOW_MS = 60 * 60 * 1000;

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
  const ip = clientIp(request);
  try {
    await assertAttemptLimit({
      kind: "unlock-fail",
      userId: user.id,
      postId: post.id,
      max: UNLOCK_FAIL_MAX,
      windowMs: UNLOCK_FAIL_WINDOW_MS,
      message: "비밀번호를 너무 많이 틀렸습니다. 1시간 뒤에 다시 시도해 주세요.",
    });
  } catch (error) {
    if (error instanceof CoolDownError) return NextResponse.json({ error: error.message }, { status: 429 });
    throw error;
  }
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!unlockPasswordOk(String(body.password ?? "").slice(0, 100), post.unlockPasswordHash)) {
    await writeAudit({ kind: "unlock-fail", userId: user.id, ip, postId: post.id }).catch(() => undefined);
    return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 403 });
  }
  const jar = await cookies();
  const next = [...parseUnlocks(jar.get(UNLOCK_COOKIE)?.value), post.id];
  jar.set(UNLOCK_COOKIE, packUnlocks(next), UNLOCK_COOKIE_OPTS);
  return NextResponse.json({ ok: true });
}
