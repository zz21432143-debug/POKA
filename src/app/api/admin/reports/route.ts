import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { writeAudit } from "@/lib/security";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      post: { select: { id: true, title: true, authorId: true, authorIp: true, hidden: true } },
      comment: { select: { id: true, content: true, authorId: true, authorIp: true, postId: true } },
      reporter: { select: { nickname: true } },
    },
  });
  return NextResponse.json({ reports });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdmin();
  if (error || !user) return error;
  const body = (await request.json()) as {
    reportId?: string;
    postId?: string;
    action?: "resolve" | "dismiss" | "delete" | "hide" | "restore";
  };

  if (body.reportId) {
    const report = await prisma.report.findUnique({ where: { id: body.reportId } });
    if (!report) {
      return NextResponse.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });
    }
    if (body.action === "dismiss") {
      await prisma.report.update({ where: { id: report.id }, data: { status: "dismissed" } });
      await writeAudit({
        kind: "REPORT_DISMISS",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: report.id,
      });
      return NextResponse.json({ ok: true, status: "dismissed" });
    }
    if (body.action === "resolve") {
      await prisma.report.update({ where: { id: report.id }, data: { status: "resolved" } });
      await writeAudit({
        kind: "REPORT_RESOLVE",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: report.id,
      });
      return NextResponse.json({ ok: true, status: "resolved" });
    }
    if (body.action === "delete") {
      if (report.targetType === "comment" && report.commentId) {
        await prisma.comment.delete({ where: { id: report.commentId } }).catch(() => undefined);
      } else if (report.postId) {
        await prisma.post.update({ where: { id: report.postId }, data: { hidden: true } });
      }
      await prisma.report.update({ where: { id: report.id }, data: { status: "resolved" } });
      await writeAudit({
        kind: "ADMIN_DELETE",
        userId: user.id,
        ip: "admin",
        postId: report.postId,
        detail: report.id,
      });
      return NextResponse.json({ ok: true, status: "resolved", deleted: true });
    }
  }

  if (!body.postId) {
    return NextResponse.json({ error: "reportId 또는 postId가 필요합니다." }, { status: 400 });
  }
  const hidden = body.action !== "restore";
  await prisma.post.update({ where: { id: body.postId }, data: { hidden } });
  await prisma.report.updateMany({
    where: { postId: body.postId },
    data: { status: hidden ? "resolved" : "dismissed" },
  });
  await writeAudit({
    kind: hidden ? "ADMIN_HIDE" : "ADMIN_RESTORE",
    userId: user.id,
    ip: "admin",
    postId: body.postId,
  });
  return NextResponse.json({ ok: true, hidden });
}
