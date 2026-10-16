import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ReportAdmin } from "@/components/admin/report-admin";
import { SanctionAdmin } from "@/components/admin/sanction-admin";
import { ForbiddenWordsAdmin } from "@/components/admin/forbidden-words-admin";
import { SiteSettingsAdmin } from "@/components/admin/site-settings-admin";
import { isStaff } from "@/lib/roles";
import { getSiteSettings } from "@/lib/site-settings";
import type { Prisma } from "@/generated/prisma/client";
import { BASE_WORDS, NICK_ADULT_WORDS, PROFANITY_CATEGORIES, PROFANITY_LABEL } from "@/lib/profanity";

export const metadata: Metadata = { title: "관리자", robots: { index: false } };

export const dynamic = "force-dynamic";

/** 관리 홈: 지금 할 일 · 메뉴 설명 */
async function AdminHome({ isMaster }: { isMaster: boolean }) {
  const dayStart = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date())}T00:00:00+09:00`);
  const { badNicknames } = await import("@/lib/nickname-force");
  const weekAgo = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(dayStart.getTime() - 6 * 86_400_000));
  const [pendingReports, restricted, signups, members, bad, errors7, shares7, gameAlertSubs, gameAlertVisits, lag7] = await Promise.all([
    prisma.report.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.user.count({ where: { status: { in: ["SUSPENDED", "BANNED"] } } }).catch(() => 0),
    prisma.user.count({ where: { createdAt: { gte: dayStart } } }).catch(() => 0),
    prisma.user.count({ where: { withdrawnAt: null, isMaster: false } }).catch(() => 0),
    isMaster ? badNicknames(100).catch(() => []) : Promise.resolve([]),
    // 최근 7일 서버 오류(같은 오류는 10분에 한 번만 기록됨)
    prisma.toolSaved.count({ where: { kind: "server-error", createdAt: { gte: new Date(dayStart.getTime() - 6 * 86_400_000) } } }).catch(() => 0),
    // 최근 7일 게임 결과 공유(오목 · 윷 「📤 공유」)
    prisma.toolSaved.count({ where: { kind: "game-share", createdAt: { gte: new Date(dayStart.getTime() - 6 * 86_400_000) } } }).catch(() => 0),
    // 게임 상대 찾기 알림: 켠 기기 · 최근 7일 알림 눌러 들어온 방문
    prisma.pushSubscription.count({ where: { gameAlerts: true } }).catch(() => 0),
    prisma.trafficDaily
      .aggregate({ where: { source: "push-game", day: { gte: weekAgo } }, _sum: { visits: true } })
      .then((r) => r._sum.visits ?? 0)
      .catch(() => 0),
    prisma.toolSaved.count({ where: { kind: "lag-report", createdAt: { gte: new Date(dayStart.getTime() - 6 * 86_400_000) } } }).catch(() => 0),
  ]);
  const cards = [
    { label: "처리할 신고", value: pendingReports, href: "/admin?tab=reports", tone: pendingReports ? "text-rose-300" : "text-emerald-300" },
    { label: "비속어 의심 닉네임", value: bad.length, href: "/admin/members#bad", tone: bad.length ? "text-rose-300" : "text-emerald-300", master: true },
    { label: "오늘 가입", value: signups, href: "/admin/stats", tone: "text-sky-300" },
    { label: "전체 회원", value: members, href: "/admin/members", tone: "text-[#e7c98a]", master: true },
    { label: "정지 · 차단 중", value: restricted, href: "/admin?tab=sanctions", tone: "text-zinc-200" },
    { label: "최근 7일 서버 오류", value: errors7, href: "/admin/errors", tone: errors7 ? "text-amber-300" : "text-emerald-300" },
    { label: "최근 7일 게임 결과 공유", value: shares7, href: "/admin/stats", tone: "text-sky-300" },
    { label: "게임 알림 켠 기기", value: gameAlertSubs, href: "/admin/push", tone: "text-sky-300" },
    { label: "최근 7일 게임 렉 신고", value: lag7, href: "/admin/errors#lag", tone: lag7 ? "text-amber-300" : "text-emerald-300" },
    { label: "최근 7일 게임 알림으로 들어옴", value: gameAlertVisits, href: "/admin/stats", tone: "text-sky-300" },
  ].filter((c) => !c.master || isMaster);
  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-semibold">🛠 관리 홈</h1>
        <p className="mt-1 text-sm text-muted-foreground">위 메뉴는 하는 일별로 묶여 있어요. 숫자를 누르면 바로 그 화면으로 가요.</p>
      </header>
      <section aria-label="지금 할 일" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} data-admin-card className="grid gap-1 rounded-2xl border border-border bg-[#151213] p-3 hover:bg-muted">
            <span className="text-xs text-muted-foreground">{c.label}</span>
            <b className={`text-2xl font-black tabular-nums ${c.tone}`}>{c.value.toLocaleString()}</b>
          </Link>
        ))}
      </section>
      <section aria-label="메뉴 안내" className="grid gap-2 rounded-2xl border border-border bg-[#151213] p-4 text-sm">
        <h2 className="text-base font-semibold">어디서 무엇을 하나요?</h2>
        <ul className="grid gap-1.5 text-muted-foreground">
          <li>👥 <b className="text-white">회원</b> — 회원 목록 · 검색 · 인증 뱃지 · <b className="text-white">닉네임 강제 변경</b>(회원 목록 · 닉네임), 정지 · 차단(제재), 신고 처리</li>
          <li>📝 <b className="text-white">콘텐츠</b> — 공지 · 안내 글 발행, 오늘의 퀴즈, 배너, 금지어</li>
          <li>🏆 <b className="text-white">랭킹 · 게임</b> — 랭킹 1위 칭호(오목 요괴 · 퀴즈 요괴 …) 켜기 · 이름, 랭킹 제외 회원, 요괴 마을 통계</li>
          <li>📊 <b className="text-white">통계 · 감시</b> — 방문 · 가입 · 유입 경로, 오류 · 포인트 이상, 애드센스, 광고 문의</li>
          <li>⚙️ <b className="text-white">사이트</b> — 사이트 문구 · 설정, 알림 보내기, 데이터 정리, 오픈 준비</li>
        </ul>
      </section>
    </div>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) notFound();
  const { tab, q } = await searchParams;
  const active =
    tab === "sanctions" ? "sanctions" : tab === "words" ? "words" : tab === "settings" ? "settings" : tab === "reports" ? "reports" : "home";
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

  // 신고 대상 작성자 닉네임(부적절한 닉네임 신고 처리용)
  const reportAuthorIds = [...new Set(reports.map((r) => r.post?.authorId ?? r.comment?.authorId).filter((v): v is string => Boolean(v)))];
  const reportAuthors = new Map(
    (reportAuthorIds.length ? await prisma.user.findMany({ where: { id: { in: reportAuthorIds } }, select: { id: true, nickname: true } }) : []).map((u) => [u.id, u.nickname]),
  );

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

  const [restricted, matches, words, settings, disabledWords] = await Promise.all([
    prisma.user.findMany({
      where: { status: { in: ["SUSPENDED", "BANNED"] } },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: userSelect,
    }),
    query ? prisma.user.findMany({ where: search, take: 20, select: userSelect }) : Promise.resolve([]),
    prisma.forbiddenWord.findMany({ orderBy: { createdAt: "desc" } }),
    user.isMaster ? getSiteSettings() : Promise.resolve(null),
    active === "words" ? prisma.disabledBaseWord.findMany({ select: { word: true } }) : Promise.resolve([]),
  ]);


  return (
    <div className="flex flex-col gap-4">
      {active === "home" ? <AdminHome isMaster={Boolean(user.isMaster)} /> : null}

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
              authorNickname: reportAuthors.get(row.post?.authorId ?? row.comment?.authorId ?? "") ?? null,
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
            아래 단어가 글·댓글 제목이나 본문에 있으면 작성이 막힙니다. 기본 금지어는 처음부터 들어 있는 단어이고,
            누르면 끄고 켤 수 있습니다. 바꾸면 바로 반영됩니다.
          </p>
          <ForbiddenWordsAdmin
            words={words.map((row) => ({ id: row.id, word: row.word, jobAllowed: row.jobAllowed }))}
            base={[
              ...PROFANITY_CATEGORIES.map((category) => ({
                category,
                label: PROFANITY_LABEL[category],
                words: BASE_WORDS[category],
              })),
              { category: "nick-adult", label: "닉네임 전용 · 성적 표현", words: NICK_ADULT_WORDS },
            ]}
            disabled={disabledWords.map((row) => row.word)}
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
