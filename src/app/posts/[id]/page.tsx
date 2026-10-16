import { Suspense } from "react";
import { notFound } from "next/navigation";
import { replaceTo } from "@/lib/history-redirect";
import { Badge } from "@/components/ui/badge";
import { HandViewer } from "@/components/hand/hand-viewer";
import { AUTHOR_SELECT, AuthorChip } from "@/components/posts/author-chip";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { FREE_BOARD_TYPES } from "@/lib/feed";
import { HandPoll } from "@/components/hand/hand-poll";
import { POLL_CHOICES } from "@/lib/poll";
import { CommentForm } from "@/components/posts/comment-form";
import { CommentThread } from "@/components/posts/comment-thread";
import { HireButton } from "@/components/jobs/hire-button";
import { VoteButtons } from "@/components/posts/vote-buttons";
import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { parseHandReview } from "@/lib/hand-review";
import { getCurrentUser } from "@/lib/current-user";
import { JOB_KIND_LABEL, boardListHref } from "@/lib/nav";
import { BackToList } from "@/components/posts/back-to-list";
import type { Metadata } from "next";
import { JobEventList, JobFacts } from "@/components/jobs/job-facts";
import { ContactReveal } from "@/components/jobs/contact-reveal";
import { PostPhotos } from "@/components/posts/post-photos";
import { LinkifiedText } from "@/components/posts/linkified-text";
import { JobScheduleText } from "@/components/jobs/job-schedule-text";
import { RelatedGuides } from "@/components/posts/related-guides";
import { canManagePost } from "@/lib/post-manage";
import { PostManageBar } from "@/components/posts/post-manage-bar";
import { DocDesk, DocSheet } from "@/components/docs/doc-sheet";
import { TdaViewer } from "@/components/tda/tda-viewer";
import { contentToDocHtml } from "@/lib/doc-sanitize";
import { PushSentNotice } from "@/components/jobs/urgent-reach";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { JobRegionInfo } from "@/components/jobs/job-region-info";
import { postIsThin } from "@/lib/seo-quality";
import { adsenseSlotId, splitForMidAd } from "@/lib/adsense";
import { getSiteSettings } from "@/lib/site-settings";
import { commentRewardLine } from "@/lib/rewards";
import Link from "next/link";
import { cookies } from "next/headers";
import { ReportButton } from "@/components/posts/report-button";
import { UnlockPostForm } from "@/components/posts/unlock-post-form";
import { canRevealPrivatePost } from "@/lib/private-post";
import { UNLOCK_COOKIE, hasUnlock } from "@/lib/unlock-cookie";
import { CrownIcon, LockIcon } from "lucide-react";
import { JobStatusBadge } from "@/components/jobs/job-cards";
import { PremiumToggle } from "@/components/jobs/premium-toggle";
import { ApplyPanel } from "@/components/jobs/apply-panel";
import { ApplicantList } from "@/components/jobs/applicant-list";
import { BumpButton } from "@/components/jobs/bump-button";
import { canBumpNow, nextBumpAt } from "@/lib/job-bump";
import { jobExpiresOn, jobStatus } from "@/lib/job-status";
import { titleRegion } from "@/lib/jobs";
import { isStaff } from "@/lib/roles";
import { PinToggle } from "@/components/posts/pin-toggle";
import { loginHref } from "@/lib/login-path";
import { eventJsonLd, jobPostingJsonLd, jsonLdString } from "@/lib/job-jsonld";
import { siteUrl } from "@/lib/site";
import { ShareButton } from "@/components/posts/share-button";
import { CapNotice } from "@/components/posts/cap-notice";
import { openJobWhere, regionWhere, parseJobRegion } from "@/lib/job-status";

/** 이전/다음 글 미리보기: 태그 · 공백 정리한 첫 90자 */
function previewOf(content: string | null | undefined) {
  const text = String(content ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 90 ? `${text.slice(0, 89)}…` : text;
}

export const dynamic = "force-dynamic";

function formatPostDateTime(value: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.post
    .findUnique({
      where: { id },
      select: {
        title: true,
        boardType: true,
        hidden: true,
        isPrivate: true,
        jobKind: true,
        jobLocation: true,
        jobPayType: true,
        jobPayAmount: true,
        jobWorkDate: true,
        jobWorkHours: true,
        jobTags: true,
        content: true,
        authorId: true,
        createdAt: true,
      },
    })
    .catch(() => null);
  if (!post || post.hidden || post.boardType === "ANONYMOUS_REVIEW") return { title: "게시글" };
  const board = BOARD_LABELS[post.boardType as BoardTypeKey] ?? "게시글";
  if (post.boardType === "JOBS" && post.jobKind) {
    const kindLabel = JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL];
    // 같은 사람이 같은 분류로 더 최근에 올린 공고가 있으면 이 글은 검색 제외(지점만 바꾼 비슷한 글 정리)
    const newer = post.authorId
      ? await prisma.post
          .findFirst({
            where: { boardType: "JOBS", hidden: false, authorId: post.authorId, jobKind: post.jobKind, createdAt: { gt: post.createdAt } },
            select: { id: true },
          })
          .catch(() => null)
      : null;
    return {
      alternates: { canonical: `/posts/${id}` },
      ...(newer ? { robots: { index: false, follow: true } } : {}),
      title: `${post.title} · ${kindLabel}`,
      // 근무 조건은 공개, 연락처는 로그인 후
      description: [
        `${titleRegion(post.jobLocation)} 홀덤 딜러 ${kindLabel}`,
        post.jobPayType && post.jobPayAmount ? `${post.jobPayType} ${post.jobPayAmount}` : null,
        post.jobWorkDate ? `근무일 ${post.jobWorkDate}` : null,
        post.jobWorkHours ? `${post.jobWorkHours}` : null,
        post.jobTags ? post.jobTags.split(",").join(" · ") : null,
        "연락처는 POKA 로그인 후 확인",
      ]
        .filter(Boolean)
        .join(" · "),
    };
  }
  if (post.isPrivate) {
    return { alternates: { canonical: `/posts/${id}` }, title: `비밀글 · ${board}`, robots: { index: false } };
  }
  // 검색 결과 설명: 본문 앞부분(태그·줄바꿈 정리)
  const summary = (post.content ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[━─=]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description = summary ? (summary.length > 150 ? `${summary.slice(0, 148)}…` : summary) : `POKA ${board} 글입니다.`;
  const title = `${post.title} · ${board}`;
  return {
    alternates: { canonical: `/posts/${id}` },
    // 짧은 글(인사 · 한 줄) · 욕설 글은 검색 제외(글은 그대로 보임)
    ...(postIsThin(post) ? { robots: { index: false, follow: true } } : {}),
    title,
    description,
    openGraph: { type: "article", title, description, url: `/posts/${id}` },
  };
}

/** 비회원 미리보기: 본문 앞 200자(태그 정리) */
function guestPreview(content: string | null) {
  const text = (content ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return null;
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser().catch(() => null);
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: AUTHOR_SELECT },
      comments: {
        where: { isAttendanceCheck: false },
        include: {
          author: { select: AUTHOR_SELECT },
          votes: viewer ? { where: { userId: viewer.id }, select: { id: true } } : false,
        },
        orderBy: { createdAt: "asc" },
      },
      votes: viewer ? { where: { userId: viewer.id } } : false,
      _count: { select: { reports: true } },
    },
  });
  if (!post) notFound();
  // 개인 구직은 운영 종료. 본명이 담긴 예전 구직 글은 작성자와 관리자만 봅니다.
  if (post.jobKind === "SEEKING" && viewer?.id !== post.authorId && !viewer?.isAdmin) notFound();
  // 비회원(검색엔진 포함): 공식 글(공지·TDA·대회 일정)은 전부, 구인은 근무 조건까지(연락처·상세는 로그인 후),
  // 그 밖의 글은 앞부분 미리보기만 봅니다.
  const guest = !viewer;
  // 공지사항·TDA 룰은 종이 문서(A4) 모양으로 보여 줍니다.
  const docBoard = post.boardType === "NOTICE" || post.boardType === "TDA";
  const officialOpen = docBoard || post.boardType === "SCHEDULE";
  if (post.boardType === "ANONYMOUS_REVIEW") {
    return (
      <article className="ink-panel mx-auto w-full max-w-lg rounded-2xl p-5">
        <h1 className="text-xl font-semibold text-white">익명 게시판 종료</h1>
        <p className="mt-3 text-sm leading-6 text-[#D1D5DB]">
          익명 게시판은 운영을 종료했습니다. 기존 글은 더 이상 공개하지 않습니다.
        </p>
        <Link href="/community" className="mt-4 inline-flex text-sm font-semibold text-primary">
          커뮤니티로
        </Link>
      </article>
    );
  }
  if (post.isAttendanceThread) replaceTo("/attendance");
  if (post.hidden && !viewer?.isAdmin) notFound();

  const jar = await cookies();
  const unlocked = hasUnlock(jar.get(UNLOCK_COOKIE)?.value, post.id);
  const canReveal = canRevealPrivatePost({
    isPrivate: post.isPrivate,
    authorId: post.authorId,
    viewerId: viewer?.id,
    isAdmin: Boolean(viewer?.isAdmin),
    unlocked,
  });
  // 비회원도 글 본문 · 댓글은 읽을 수 있음(쓰기 · 투표 · 구인 글 상세와 연락처는 로그인 뒤)
  const canRead = canReveal && (!guest || officialOpen || post.boardType !== "JOBS");
  // 짧은 글 · 욕설 글에는 광고를 달지 않음(애드센스: 내용 없는 페이지 광고 금지)
  const adsOk = canRead && !postIsThin(post);
  const adSlots = adsOk ? ((await getSiteSettings().catch(() => null))?.adsSlots ?? {}) : {};
  const status = post.boardType === "JOBS" ? jobStatus(post) : null;
  const expiresOn = status === "open" ? jobExpiresOn(post) : null;
  const staff = Boolean(viewer && isStaff(viewer));
  const isJobPost = post.boardType === "JOBS" && Boolean(post.jobKind) && post.jobKind !== "SEEKING";
  const isJobOwner = isJobPost && Boolean(viewer && (viewer.id === post.authorId || viewer.isAdmin));
  // 지원 기록: 작성자는 지원자 목록을, 다른 회원은 내 지원 여부만 봅니다.
  const [applicants, myApplication] = await Promise.all([
    isJobOwner
      ? prisma.jobApplication
          .findMany({
            where: { postId: post.id },
            orderBy: { createdAt: "desc" },
            include: { applicant: { select: { nickname: true, level: true, isDealerVerified: true } } },
          })
          .catch(() => [])
      : Promise.resolve([]),
    isJobPost && viewer && !isJobOwner
      ? prisma.jobApplication
          .findUnique({
            where: { postId_applicantId: { postId: post.id, applicantId: viewer.id } },
            select: { id: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  if (canRead) {
    void prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
  }

  const hand = parseHandReview(post.handReviewJson);
  const myVote = Array.isArray(post.votes) ? (post.votes[0]?.value ?? 0) : 0;

  const pollCounts: Record<string, number> = Object.fromEntries(
    POLL_CHOICES.map((choice) => [choice.id, 0]),
  );
  let myPollChoice: string | null = null;
  if (post.boardType === "HAND_REVIEW") {
    const rows = await prisma.handPollVote.groupBy({
      by: ["choice"],
      where: { postId: post.id },
      _count: { _all: true },
    });
    for (const row of rows) pollCounts[row.choice] = row._count._all;
    if (viewer) {
      const mine = await prisma.handPollVote.findUnique({
        where: { postId_userId: { postId: post.id, userId: viewer.id } },
      });
      myPollChoice = mine?.choice ?? null;
    }
  }

  const listHref = boardListHref(post.boardType, post.jobKind);

  // 아래 「다른 글」: 구인은 같은 지역 모집 중 공고, 그 밖은 같은 게시판 최신 글
  const related = !isJobPost
    ? []
    : await prisma.post
    .findMany({
      where: isJobPost
        ? { AND: [{ boardType: "JOBS", hidden: false, isAttendanceThread: false, id: { not: post.id }, jobKind: { not: "SEEKING" } }, regionWhere(parseJobRegion(titleRegion(post.jobLocation))), openJobWhere()] }
        : { boardType: post.boardType, hidden: false, isPrivate: false, isAttendanceThread: false, id: { not: post.id } },
      orderBy: isJobPost ? { bumpedAt: "desc" } : { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true },
    })
    .catch(() => [] as { id: string; title: string }[]);
  // 구인 말고는 실제 게시판 목록처럼(말머리 · 제목 · 작성자 · 칭호 · 날짜 · 댓글): 자유게시판은 질문 · 현장 스케치까지
  const freeFamily = (FREE_BOARD_TYPES as readonly string[]).includes(post.boardType);
  // 이전 글(더 오래된) · 다음 글(더 최근): 같은 게시판(자유게시판은 질문 · 현장 스케치까지)
  const neighborWhere = {
    boardType: freeFamily ? { in: [...FREE_BOARD_TYPES] } : post.boardType,
    hidden: false,
    isPrivate: false,
    isAttendanceThread: false,
    id: { not: post.id },
  };
  const [prevPost, nextPost] = isJobPost
    ? [null, null]
    : await Promise.all([
        prisma.post.findFirst({ where: { ...neighborWhere, createdAt: { lt: post.createdAt } }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, boardType: true, content: true } }).catch(() => null),
        prisma.post.findFirst({ where: { ...neighborWhere, createdAt: { gt: post.createdAt } }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, boardType: true, content: true } }).catch(() => null),
      ]);
  const relatedPosts: PostSummary[] = isJobPost
    ? []
    : await prisma.post
        .findMany({
          where: {
            boardType: freeFamily ? { in: [...FREE_BOARD_TYPES] } : post.boardType,
            hidden: false,
            isPrivate: false,
            isAttendanceThread: false,
            id: { not: post.id },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { author: { select: AUTHOR_SELECT }, _count: { select: { comments: true } } },
        })
        .then((rows) =>
          rows.map((r) => ({
            id: r.id,
            boardType: r.boardType,
            title: r.title,
            author: r.author,
            upvoteCount: r.upvoteCount,
            createdAt: r.createdAt.toISOString(),
            viewCount: r.viewCount,
            commentCount: r._count.comments,
            ratingManner: r.ratingManner,
            ratingService: r.ratingService,
            ratingFacility: r.ratingFacility,
            ratingAtmosphere: r.ratingAtmosphere,
            isPrivate: r.isPrivate,
          })),
        )
        .catch(() => [] as PostSummary[]);

  // 검색엔진용: 모집 중인 공고는 구글 채용 검색(JobPosting), 대회 일정은 Event
  const base = siteUrl();
  const structured =
    isJobPost && status === "open" && !post.isPrivate
      ? jobPostingJsonLd(post, base, expiresOn)
      : post.boardType === "SCHEDULE"
        ? eventJsonLd(post, base)
        : null;

  return (
    <article className="flex flex-col gap-4">
      {structured ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(structured) }} /> : null}
      {/* 급구를 막 올렸으면: 알림을 몇 명에게 보냈는지 */}
      <Suspense fallback={null}>
        <PushSentNotice />
      </Suspense>
      <CapNotice postId={post.id} />
      <div className="flex items-center justify-between gap-2">
        <BackToList href={listHref} />
        {post.isPrivate ? null : <ShareButton path={`/posts/${post.id}`} title={post.title} />}
      </div>
      <div className="article-sheet ink-panel">
      <header className="article-head">
        <div className="flex flex-wrap items-center gap-2">
          <span className="article-kicker">
            {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
          </span>
          {post.jobKind ? (
            <Badge variant="outline">
              {JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL]}
            </Badge>
          ) : null}
          {status ? <JobStatusBadge status={status} seeking={post.jobKind === "SEEKING"} /> : null}
          {post.isPaid && status === "open" ? (
            <Badge className="gap-1 bg-gradient-to-r from-[#e7c98a] to-[#c59b27] text-[#1d1611]">
              <CrownIcon className="size-3" />
              프리미엄
            </Badge>
          ) : null}
          {post.bannerSlot ? <Badge>배너 {post.bannerSlot}구좌</Badge> : null}
          {post.isPrivate ? <Badge variant="outline">비밀글</Badge> : null}
        </div>
        {/* TDA 룰은 아래 종이 문서에 제목이 크게 들어가므로 여기 제목은 화면에서 숨깁니다(공지는 보통 글처럼 보여 줌). */}
        <h1 className={docBoard && post.boardType !== "NOTICE" ? "sr-only" : "article-title"}>{post.title}</h1>
      </header>
      <div className="article-meta">
        <AuthorChip author={post.author} anonymous={false} size="md" />
        <div className="article-meta-side">
          <time dateTime={post.createdAt.toISOString()}>{formatPostDateTime(post.createdAt)}</time>
          <span>조회 {(post.viewCount + (canRead ? 1 : 0)).toLocaleString()}</span>
        </div>
      </div>
      {canManagePost(viewer, post) ? (
        <div className="px-4 pb-1 sm:px-6">
          <PostManageBar postId={post.id} listHref={listHref} />
        </div>
      ) : null}

      {guest && !canRead ? (
        <div className="article-body">
          {isJobPost ? (
            <>
              {/* 근무 조건(지역·시급·날짜·인원)은 공개, 지원 방법·연락처는 로그인 후 */}
              <JobFacts job={{ ...post, jobApplyMethod: null }} />
              <JobEventList job={post} />
            </>
          ) : !post.isPrivate && guestPreview(post.content) ? (
            <p data-guest-preview className="article-copy whitespace-pre-line text-[#ece4d6]">
              {guestPreview(post.content)}
            </p>
          ) : null}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#3a332c] bg-[#141110] px-4 py-8 text-center">
            <LockIcon className="size-6 text-[#e7c98a]" aria-hidden />
            <p className="text-[15px] font-semibold text-white">
              {isJobPost ? "연락처·지원 방법과 상세 내용은" : "글 전체와 댓글은"} 로그인한 회원만 볼 수 있습니다.
            </p>
            <p className="text-sm text-[#9CA3AF]">카카오 또는 구글로 10초 만에 가입할 수 있어요.</p>
            <Link
              href={loginHref(`/posts/${post.id}`)}
              className="touch-target inline-flex min-h-12 items-center rounded-full bg-[#8b2222] px-6 text-sm font-bold text-white hover:bg-[#a12a2a]"
            >
              {isJobPost ? "로그인하고 공고 보기" : "로그인하고 글 보기"}
            </Link>
          </div>
        </div>
      ) : null}

      {post.isPrivate && !canReveal && !guest ? (
        <div className="p-4">
          <UnlockPostForm postId={post.id} />
        </div>
      ) : null}

      {canRead ? (
        <div className="article-body">
      {post.jobKind ? <JobFacts job={post} /> : null}
      {post.jobKind ? <JobEventList job={post} /> : null}
      {post.jobKind ? (
        <section className="rounded-xl border-2 border-emerald-700/60 bg-[#0f1a14] p-4">
          <p className="mb-2 text-sm font-bold text-emerald-200">연락처</p>
          <ContactReveal
            hasContact={Boolean(post.jobContact || post.jobApplyValue)}
            loggedIn={Boolean(viewer)}
            contact={viewer ? post.jobContact || post.jobApplyValue || null : null}
            loginHref={loginHref(`/posts/${post.id}`)}
          />
        </section>
      ) : null}
      {post.jobKind && post.jobApplyValue && status === "open" ? (
        <a
          href={post.jobApplyValue}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
          className="touch-target flex min-h-12 items-center justify-center rounded-xl bg-[#c9a25c] px-4 text-sm font-bold text-[#1d1611] hover:bg-[#e7c98a]"
        >
          지원서 작성하기 ↗
        </a>
      ) : null}
      {expiresOn ? <p className="text-xs text-[#9CA3AF]">자동 마감 예정일 {expiresOn}</p> : null}
      {post.jobKind && staff ? <PremiumToggle postId={post.id} isPaid={post.isPaid} /> : null}
      {staff && !post.jobKind ? <PinToggle postId={post.id} pinned={Boolean(post.pinnedAt)} /> : null}
      {isJobPost && !isJobOwner && status === "open" ? (
        <ApplyPanel
          postId={post.id}
          applied={Boolean(myApplication)}
          loggedIn={Boolean(viewer)}
          loginHref={loginHref(`/posts/${post.id}`)}
        />
      ) : null}
      {isJobOwner ? (
        <>
          {status === "open" ? (
            <BumpButton
              postId={post.id}
              nextAt={staff ? null : nextBumpAt(post.bumpedAt).toISOString()}
              waiting={!staff && !canBumpNow(post.bumpedAt)}
            />
          ) : null}
          <ApplicantList
            applicants={applicants.map((row) => ({
              id: row.id,
              message: row.message,
              createdAt: row.createdAt.toISOString(),
              applicant: row.applicant,
            }))}
          />
        </>
      ) : null}

      {post.boardType === "SCHEDULE" ? (
        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-[#3a332c] bg-[#141110] p-3 text-sm text-[#E5E7EB] sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[#9CA3AF]">개최 장소</dt>
            <dd>{post.promoLocation || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">일정</dt>
            <dd>
              {post.eventDate || "—"}
              {post.eventEndDate && post.eventEndDate !== post.eventDate ? ` ~ ${post.eventEndDate}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#9CA3AF]">총상금</dt>
            <dd>{post.eventPrize || "—"}</dd>
          </div>
          {post.eventLink ? (
            <div className="col-span-full">
              <dt className="text-xs text-[#9CA3AF]">공식 링크</dt>
              <dd>
                <a href={post.eventLink} className="text-primary" target="_blank" rel="noreferrer">
                  {post.eventLink}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {post.boardType === "PROMO" && post.bannerImageUrl ? (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.bannerImageUrl} alt={post.title} className="mx-auto max-h-[720px] w-full object-contain" />
        </div>
      ) : null}

      {post.boardType === "SCHEDULE" && post.bannerImageUrl && !post.bannerImageUrl.startsWith("/banners/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.bannerImageUrl} alt={`${post.title} 포스터`} className="mx-auto block h-auto max-h-[85dvh] w-auto max-w-full rounded-2xl border border-border bg-black object-contain" />
      ) : null}


      {post.jobKind && !post.jobFilled && (viewer?.id === post.authorId || viewer?.isAdmin) ? (
        <HireButton postId={post.id} filled={post.jobFilled} />
      ) : status === "filled" ? (
        <p className="text-sm text-primary">
          {post.jobKind === "SEEKING" ? "구직이 마감된 글입니다." : "채용이 완료된 공고입니다."}
        </p>
      ) : status === "expired" ? (
        <p className="text-sm text-[#9CA3AF]">
          {post.jobKind === "URGENT" ? "근무일이 지나 마감된 급구입니다." : "등록 후 30일이 지나 자동 마감된 공고입니다."}
        </p>
      ) : null}

      {hand ? <HandViewer hand={hand} /> : null}

      {post.boardType === "HAND_REVIEW" ? (
        <HandPoll postId={post.id} initialCounts={pollCounts} initialChoice={myPollChoice} />
      ) : null}

      {post.boardType === "SKETCH" && post.bannerImageUrl && post.imageUrls.length === 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.bannerImageUrl}
          alt={post.title}
          className="w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      {post.boardType === "TDA" && post.docPdfUrl ? (
        // PDF 원본이 있는 TDA 룰: 위 검색창 + 연속 스크롤 PDF 뷰어
        <TdaViewer
          sections={[{ id: post.id, title: post.title, html: "", pdfUrl: post.docPdfUrl }]}
          loggedIn
          canManage={false}
        />
      ) : post.content && post.boardType === "NOTICE" ? (
        // 공지: A4 종이 대신 화면에 맞는 큰 글씨(긴 공지도 넘치지 않음)
        <section data-notice-body className="notice-body rounded-2xl border-2 border-[#c9a25c]/55 bg-[#1d1611] px-4 py-5 sm:px-7 sm:py-7" dangerouslySetInnerHTML={{ __html: contentToDocHtml(post.content) }} />
      ) : post.content && docBoard ? (
        <DocDesk className="-mx-2 sm:mx-0">
          <DocSheet
            title={post.title}
            meta={formatPostDateTime(post.createdAt)}
            html={contentToDocHtml(post.content)}
          />
        </DocDesk>
      ) : post.content && post.jobKind ? (
        <section aria-label="상세 내용" className="rounded-xl border border-[#4a3f33] bg-[#17120f] p-3 sm:p-4">
          <p className="mb-2 text-sm font-bold text-[#e7c98a]">상세 내용</p>
          <div className="article-copy">
            <JobScheduleText text={post.content} />
          </div>
        </section>
      ) : post.content ? (
        (() => {
          // 긴 글은 가운데 문단 사이에 광고 하나(구글 · 단위가 없으면 그냥 한 덩어리)
          const halves = adsOk && adsenseSlotId("post-mid", adSlots) ? splitForMidAd(post.content) : null;
          return halves ? (
            <>
              <div className="article-copy">
                <LinkifiedText text={halves[0]} />
              </div>
              <GoogleAdUnit placement="post-mid" className="my-3" />
              <div className="article-copy">
                <LinkifiedText text={halves[1]} />
              </div>
            </>
          ) : (
            <div className="article-copy">
              <LinkifiedText text={post.content} />
            </div>
          );
        })()
      ) : null}
      {/* 글 사진(회원 게시판). 구인 글에는 사진이 없습니다. */}
      {post.jobKind ? null : <PostPhotos urls={post.imageUrls} title={post.title} />}
        </div>
      ) : null}

      {/* 구인 글: 지역 공고 수 · 시급 평균 · 실수령 예시 · 지원 전 체크리스트(비회원에게도) */}
      {isJobPost ? (
        <div className="px-4 pb-2 sm:px-6">
          <JobRegionInfo
            region={titleRegion(post.jobLocation)}
            kindLabel={JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL] ?? "구인"}
          />
        </div>
      ) : null}

      {canRead && viewer ? (
        <div className="article-votes">
          <div className="vote-bar">
            <VoteButtons
              postId={post.id}
              upvoteCount={post.upvoteCount}
              downvoteCount={post.downvoteCount}
              initialVote={myVote}
            />
            <ReportButton targetType="post" targetId={post.id} look="pill" />
          </div>
        </div>
      ) : null}

      {/* 본문 바로 아래 광고(가장 많이 보는 자리) */}
      {adsOk ? <GoogleAdUnit placement="post-top" /> : null}

      {canRead ? (
      <section className="article-comments">
        <h2 className="text-lg font-bold text-white">댓글 {post.comments.length}</h2>
        {viewer ? (
          <CommentForm
            postId={post.id}
            submitLabel="댓글 등록"
            placeholder={`댓글을 남겨 주세요. ${commentRewardLine()}가 지급됩니다.`}
          />
        ) : (
          <p className="rounded-xl border border-[#3a332c] bg-[#141110] px-3 py-3 text-sm text-[#D1D5DB]">
            댓글은 로그인 후 남길 수 있습니다. {commentRewardLine()}가 지급됩니다.{" "}
            <Link href={loginHref(`/posts/${post.id}`)} className="font-medium text-primary underline">
              로그인
            </Link>
          </p>
        )}
        {post.comments.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">아직 댓글이 없습니다.</p>
        ) : (
          <CommentThread
            anonymous={false}
            comments={post.comments.map((comment) => ({
              id: comment.id,
              content: comment.content,
              upvoteCount: comment.upvoteCount,
              author: comment.author,
              liked: Array.isArray(comment.votes) && comment.votes.length > 0,
            }))}
          />
        )}
      </section>
      ) : null}
      </div>

      {/* 이전 글 · 다음 글 */}
      {prevPost || nextPost ? (
        <nav aria-label="이전 글 다음 글" data-post-neighbors className="ink-panel grid overflow-hidden rounded-2xl">
          {[
            { row: nextPost, label: "▲ 다음 글" },
            { row: prevPost, label: "▼ 이전 글" },
          ].map(({ row, label }) =>
            row ? (
              <Link key={label} href={`/posts/${row.id}`} className="group flex min-h-12 flex-wrap items-center gap-x-3 border-b border-white/5 px-4 py-1 last:border-0 hover:bg-white/5">
                <span className="shrink-0 text-xs font-black text-[#c9a25c]">{label}</span>
                {/* 말머리: 자유게시판은 질문 · 현장 스케치가 섞여서 구분 */}
                {freeFamily ? (
                  <span data-neighbor-board className="shrink-0 rounded-full bg-[#7a1c22] px-2 py-0.5 text-[11px] font-black text-[#f6efe2]">
                    {BOARD_LABELS[row.boardType as BoardTypeKey] ?? "자유게시판"}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#E5E7EB]">{row.title}</span>
                {/* PC: 마우스를 올리면 첫 줄 미리보기 */}
                {previewOf(row.content) ? (
                  <span data-neighbor-preview className="hidden basis-full truncate pb-1 text-xs text-zinc-400 lg:group-hover:block">
                    {previewOf(row.content)}
                  </span>
                ) : null}
              </Link>
            ) : (
              <span key={label} className="flex min-h-12 items-center gap-3 border-b border-white/5 px-4 text-sm text-zinc-500 last:border-0">
                <span className="shrink-0 text-xs font-black">{label}</span>
                {label.includes("다음") ? "가장 최근 글이에요" : "첫 글이에요"}
              </span>
            ),
          )}
        </nav>
      ) : null}

      {/* 이 게시판 다른 글: 게시판 목록과 같은 모양 */}
      {!isJobPost && relatedPosts.length ? (
        <section aria-label="이 게시판 다른 글" data-related-posts className="grid gap-2">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-base font-black text-[#f3d9a4]">{freeFamily ? "자유게시판" : (BOARD_LABELS[post.boardType as BoardTypeKey] ?? "게시판")} 다른 글</h2>
            <Link href={listHref} className="tap-pad relative ml-auto text-xs font-bold text-[#c9a25c]">
              목록 전체 ›
            </Link>
          </div>
          <PostList posts={relatedPosts} emptyText="" showBoard={freeFamily} />
        </section>
      ) : null}
      {isJobPost && related.length ? (
        <section aria-label={isJobPost ? "이 지역 다른 공고" : "이 게시판 다른 글"} className="ink-panel grid gap-1 rounded-2xl p-4">
          <h2 className="text-base font-black text-[#f3d9a4]">{isJobPost ? `${titleRegion(post.jobLocation)} 다른 공고` : `${BOARD_LABELS[post.boardType as BoardTypeKey] ?? "게시판"} 다른 글`}</h2>
          <ul className="grid">
            {related.map((row) => (
              <li key={row.id}>
                <Link href={`/posts/${row.id}`} className="flex min-h-11 items-center border-b border-white/5 text-[15px] text-[#E5E7EB] last:border-0 hover:text-[#e7c98a]">
                  <span className="truncate">{row.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 정보 글(질문 · 자유 · 공지 · 핸드리뷰) → 관련 딜러 가이드(서로 이어서 검색 노출) */}
      {!post.jobKind && ["RULE_QA", "FREE", "NOTICE", "HAND_REVIEW"].includes(post.boardType) && (post.content?.length ?? 0) > 200 ? (
        <RelatedGuides title={post.title} content={post.content ?? ""} />
      ) : null}
      <div className="flex justify-center">
        <BackToList href={listHref} className="w-full justify-center sm:w-auto sm:min-w-48" />
      </div>

      {adsOk ? (
        <>
          <GoogleAdUnit placement="post-bottom" />
        </>
      ) : null}
    </article>
  );
}
