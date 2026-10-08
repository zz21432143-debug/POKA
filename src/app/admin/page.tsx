import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ReportAdmin } from "@/components/admin/report-admin";
import { SanctionAdmin } from "@/components/admin/sanction-admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { normalizeNickname } from "@/lib/nickname";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  const { tab, q } = await searchParams;
  const active = tab === "sanctions" ? "sanctions" : "reports";
  const query = normalizeNickname(q ?? "");

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      post: { select: { id: true, title: true, authorId: true, authorIp: true, hidden: true } },
      comment: { select: { id: true, content: true, authorId: true, authorIp: true } },
      reporter: { select: { nickname: true } },
    },
  });

  const [restricted, matches] = await Promise.all([
    prisma.user.findMany({
      where: { status: { in: ["SUSPENDED", "BANNED"] } },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: {
        id: true,
        nickname: true,
        status: true,
        suspendedUntil: true,
        banReason: true,
      },
    }),
    query
      ? prisma.user.findMany({
          where: { nickname: { contains: query, mode: "insensitive" } },
          take: 20,
          select: {
            id: true,
            nickname: true,
            status: true,
            suspendedUntil: true,
            banReason: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">관리자 페이지</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          관리자(Admin)만 볼 수 있습니다. 신고를 처리하고 계정을 제재할 수 있습니다.
        </p>
        <div className="mt-3">
          <AdminNav current={active === "sanctions" ? "/admin?tab=sanctions" : "/admin?tab=reports"} />
        </div>
        {user.isMaster ? (
          <Link href="/admin/members" className="mt-2 inline-flex text-sm text-primary">
            인증 달기
          </Link>
        ) : null}
      </header>

      {active === "reports" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">신고 관리</h2>
          <ReportAdmin
            reports={reports.map((row) => ({
              id: row.id,
              reason: row.reason,
              status: row.status,
              targetType: row.targetType,
              reporter: row.reporter.nickname,
              reporterIp: row.reporterIp,
              postId: row.post?.id ?? row.postId ?? null,
              title: row.post?.title ?? (row.comment ? "댓글 신고" : "삭제된 대상"),
              commentPreview: row.comment?.content?.slice(0, 160) ?? null,
              authorId: row.post?.authorId ?? row.comment?.authorId ?? null,
              authorIp: row.post?.authorIp ?? row.comment?.authorIp ?? null,
              hidden: Boolean(row.post?.hidden),
            }))}
          />
        </section>
      ) : (
        <SanctionAdmin
          restricted={restricted.map((row) => ({
            ...row,
            suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
          }))}
          initialMatches={matches.map((row) => ({
            ...row,
            suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
          }))}
          initialQuery={q ?? ""}
        />
      )}
    </div>
  );
}
