import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/security";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      post: { select: { id: true, title: true, authorId: true, authorIp: true, hidden: true } },
      reporter: { select: { nickname: true } },
    },
  });
  return NextResponse.json({ reports });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const body = (await request.json()) as { postId?: string; action?: "hide" | "restore" };
  if (!body.postId) {
    return NextResponse.json({ error: "postId가 필요합니다." }, { status: 400 });
  }
  const hidden = body.action !== "restore";
  await prisma.post.update({ where: { id: body.postId }, data: { hidden } });
  await prisma.report.updateMany({
    where: { postId: body.postId },
    data: { status: hidden ? "HIDDEN" : "DISMISSED" },
  });
  await writeAudit({
    kind: hidden ? "ADMIN_HIDE" : "ADMIN_RESTORE",
    userId: user.id,
    ip: "admin",
    postId: body.postId,
  });
  return NextResponse.json({ ok: true, hidden });
}
