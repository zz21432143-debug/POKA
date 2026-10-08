import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ReportAdmin } from "@/components/admin/report-admin";
import { SanctionAdmin } from "@/components/admin/sanction-admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { ForbiddenWordsAdmin } from "@/components/admin/forbidden-words-admin";
import { SiteSettingsAdmin } from "@/components/admin/site-settings-admin";
import { isStaff } from "@/lib/roles";
import { getSiteSettings } from "@/lib/site-settings";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const { tab, q } = await searchParams;
  const active =
    tab === "sanctions" ? "sanctions" : tab === "words" ? "words" : tab === "settings" ? "settings" : "reports";
  const query = (q ?? "").trim();

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      post: { select: { id: true, title: true, authorId: true, authorIp: true, hidden: true } },
      comment: { select: { id: true, content: true, authorId: true, authorIp: true } },
      reporter: { select: { nickname: true } },
    },
  });

  const search: Prisma.UserWhereInput | undefined = query
    ? {
        OR: [
          { nickname: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { signupIp: { contains: query } },
          { posts: { some: { authorIp: { contains: query } } } },
          { comments: { some: { authorIp: { contains: query } } } },
        ],
      }
    : undefined;

  const userSelect = {
    id: true,
    nickname: true,
    email: true,
    signupIp: true,
    status: true,
    suspendedUntil: true,
    banReason: true,
  } as const;

  const [restricted, matches, words, settings] = await Promise.all([
    prisma.user.findMany({
      where: { status: { in: ["SUSPENDED", "BANNED"] } },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: userSelect,
    }),
    query ? prisma.user.findMany({ where: search, take: 20, select: userSelect }) : Promise.resolve([]),
    prisma.forbiddenWord.findMany({ orderBy: { createdAt: "desc" } }),
    user.isMaster ? getSiteSettings() : Promise.resolve(null),
  ]);

  const currentHref =
    active === "sanctions"
      ? "/admin?tab=sanctions"
      : active === "words"
        ? "/admin?tab=words"
        : active === "settings"
          ? "/admin?tab=settings"
          : "/admin?tab=reports";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">관리자 페이지</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          관리자·마스터만 볼 수 있습니다. 신고·제재·금지어·사이트 문구를 여기서 바꿉니다.
        </p>
        <div className="mt-3">
          <AdminNav current={currentHref} isMaster={user.isMaster} />
        </div>
        {user.isMaster ? (
          <Link href="/admin/members" className="mt-2 inline-flex text-sm text-primary">
            인증 달기
          </Link>
        ) : null}
      </header>

      {active === "reports" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">신고 및 게시물</h2>
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
      ) : null}

      {active === "sanctions" ? (
        <SanctionAdmin
          restricted={restricted.map((row) => ({
            ...row,
            suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
          }))}
          initialMatches={matches.map((row) => ({
            ...row,
            suspendedUntil: row.suspendedUntil?.toISOString() ?? null,
          }))}
          initialQuery={query}
        />
      ) : null}

      {active === "words" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">금지어 관리</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            등록된 단어가 글·댓글 제목이나 본문에 있으면 작성이 막힙니다. 아래에 있는 목록이 현재 적용 중인 내역입니다.
            단어를 추가하거나 삭제하면 바로 반영됩니다.
          </p>
          <ForbiddenWordsAdmin
            words={words.map((row) => ({
              id: row.id,
              word: row.word,
              createdAt: row.createdAt.toISOString(),
            }))}
          />
        </section>
      ) : null}

      {active === "settings" ? (
        user.isMaster && settings ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold">사이트 기본 설정</h2>
            <SiteSettingsAdmin initial={settings} />
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">사이트 설정은 마스터만 바꿀 수 있습니다.</p>
        )
      ) : null}
    </div>
  );
}
