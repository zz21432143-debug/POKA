import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { BLOG_POSTED_KIND } from "@/lib/blog-posted";

export const dynamic = "force-dynamic";

/** 블로그 글감 「올렸어요」 표시 · 취소: { key, done } */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; done?: unknown };
  const key = typeof body.key === "string" && /^(holdem|dealer):[a-z0-9-]{1,80}$/.test(body.key) ? body.key : "";
  if (!key) return NextResponse.json({ error: "글감을 찾을 수 없습니다." }, { status: 400 });
  // 운영자끼리 같이 보는 표시(누가 올렸든 하나)
  await prisma.toolSaved.deleteMany({ where: { kind: BLOG_POSTED_KIND, name: key } });
  if (body.done === true) {
    await prisma.toolSaved.create({ data: { ownerId: user.id, kind: BLOG_POSTED_KIND, name: key, dataJson: "{}" } });
  }
  return NextResponse.json({ ok: true });
}
