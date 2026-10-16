import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { isStaff } from "@/lib/roles";
import { storeLogoId } from "@/lib/job-chat";

/** 매장 로고(작성자 · 매장마다 하나): { postId, url } — url이 비면 지움 · 이 사이트에 올린 사진만 */
export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "로그인해 주세요." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { postId?: unknown; url?: unknown };
  const postId = typeof body.postId === "string" ? body.postId : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, boardType: true, jobCompanyName: true } }).catch(() => null);
  if (!post || post.boardType !== "JOBS" || !post.authorId) return NextResponse.json({ error: "구인 공고가 아니에요." }, { status: 404 });
  if (post.authorId !== user.id && !isStaff(user)) return NextResponse.json({ error: "작성자만 바꿀 수 있어요." }, { status: 403 });
  if (!post.jobCompanyName) return NextResponse.json({ error: "공고에 매장 이름이 있어야 로고를 붙일 수 있어요." }, { status: 400 });
  const id = storeLogoId(post.authorId, post.jobCompanyName);
  if (!url) {
    await prisma.toolSaved.deleteMany({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  if (!/^\/api\/images\/[a-z0-9]+$/i.test(url)) {
    return NextResponse.json({ error: "이 사이트에 올린 사진만 쓸 수 있어요." }, { status: 400 });
  }
  await prisma.toolSaved.upsert({
    where: { id },
    create: { id, ownerId: post.authorId, kind: "store-logo", name: post.jobCompanyName.slice(0, 60), dataJson: JSON.stringify({ url }) },
    update: { dataJson: JSON.stringify({ url }), name: post.jobCompanyName.slice(0, 60) },
  });
  return NextResponse.json({ ok: true, url });
}
