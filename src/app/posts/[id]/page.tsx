import { notFound } from "next/navigation";
import { replaceTo } from "@/lib/history-redirect";
import { Badge } from "@/components/ui/badge";
import { HandViewer } from "@/components/hand/hand-viewer";
import { AUTHOR_SELECT, AuthorChip } from "@/components/posts/author-chip";
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
import { LinkifiedText } from "@/components/posts/linkified-text";
import { canWriteBoard } from "@/lib/permissions";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
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
import { loginHref } from "@/lib/login-path";

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
      },
    })
    .catch(() => null);
  if (!post || post.hidden || post.boardType === "ANONYMOUS_REVIEW") return { title: "게시글" };
  const board = BOARD_LABELS[post.boardType as BoardTypeKey] ?? "게시글";
  if (post.boardType === "JOBS" && post.jobKind) {
    const kindLabel = JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL];
    return {
      alternates: { canonical: `/posts/${id}` },
      title: `${post.title} · ${kindLabel}`,
      // 비회원에게는 제목까지만 공개하므로 설명에도 지역·분류만 넣고 조건은 넣지 않습니다.
      description: `${titleRegion(post.jobLocation)} 홀덤펍 ${kindLabel} 공고입니다. 근무 조건과 연락처는 POKA 로그인 후 확인할 수 있습니다.`,
    };
  }
  return {
    alternates: { canonical: `/posts/${id}` },
    title: post.isPrivate ? `비밀글 · ${board}` : `${post.title} · ${board}`,
    robots: post.isPrivate ? { index: false } : undefined,
  };
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
  // 비회원은 모든 글에서 제목(게시판·작성자·작성일)까지만 봅니다. 본문·조건·연락처·사진·댓글은 로그인 후.
  const guest = !viewer;
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
  const canRead = canReveal && !guest;
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

  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <BackToList href={listHref} />
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
        <h1 className="article-title">{post.title}</h1>
      </header>
      <div className="article-meta">
        <AuthorChip author={post.author} anonymous={false} size="md" />
        {(post.boardType === "JOBS" && (viewer?.id === post.authorId || viewer?.isAdmin)) ||
        (post.boardType === "TDA" && canWriteBoard(viewer, "TDA")) ? (
          <Link href={`/posts/${post.id}/edit`} className="text-sm font-semibold text-primary">
            수정
          </Link>
        ) : null}
        <div className="article-meta-side">
          <time dateTime={post.createdAt.toISOString()}>{formatPostDateTime(post.createdAt)}</time>
          <span>조회 {(post.viewCount + (canRead ? 1 : 0)).toLocaleString()}</span>
        </div>
      </div>

      {guest ? (
        <div className="article-body">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#3a332c] bg-[#141110] px-4 py-8 text-center">
            <LockIcon className="size-6 text-[#e7c98a]" aria-hidden />
            <p className="text-[15px] font-semibold text-white">
              {isJobPost ? "근무 조건·연락처와 상세 내용은" : "글 내용은"} 로그인한 회원만 볼 수 있습니다.
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

      {post.boardType === "SCHEDULE" && post.bannerImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.bannerImageUrl} alt={post.title} className="w-full rounded-2xl border border-border object-cover" />
      ) : null}

      {post.jobKind ? (
        <section className="rounded-xl border border-[#3a332c] bg-[#141110] p-3">
          <p className="mb-2 text-xs text-[#9CA3AF]">연락처</p>
          <ContactReveal
            postId={post.id}
            hasContact={Boolean(post.jobContact)}
            loggedIn={Boolean(viewer)}
          />
        </section>
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

      {post.boardType === "SKETCH" && post.bannerImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.bannerImageUrl}
          alt={post.title}
          className="w-full rounded-2xl border border-border object-cover"
        />
      ) : null}

      {post.content ? (
        <div className="article-copy">
          <LinkifiedText text={post.content} />
        </div>
      ) : null}
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

      <div className="flex justify-center">
        <BackToList href={listHref} className="w-full justify-center sm:w-auto sm:min-w-48" />
      </div>

      {canRead ? (
        <>
          <GoogleAdUnit placement="post-top" />
          <GoogleAdUnit placement="post-bottom" />
        </>
      ) : null}
    </article>
  );
}
