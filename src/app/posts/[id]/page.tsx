import { notFound } from "next/navigation";
import { replaceTo, replaceToLogin } from "@/lib/history-redirect";
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
import { JobFacts } from "@/components/jobs/job-facts";
import { ContactReveal } from "@/components/jobs/contact-reveal";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { commentRewardLine } from "@/lib/rewards";
import Link from "next/link";
import { cookies } from "next/headers";
import { ReportButton } from "@/components/posts/report-button";
import { UnlockPostForm } from "@/components/posts/unlock-post-form";
import { canRevealPrivatePost } from "@/lib/private-post";
import { UNLOCK_COOKIE, hasUnlock } from "@/lib/unlock-cookie";

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
    .findUnique({ where: { id }, select: { title: true, boardType: true, hidden: true, isPrivate: true } })
    .catch(() => null);
  if (!post || post.hidden || post.boardType === "ANONYMOUS_REVIEW") return { title: "게시글" };
  const board = BOARD_LABELS[post.boardType as BoardTypeKey] ?? "게시글";
  return {
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
  if (!viewer) replaceToLogin(`/posts/${id}`);
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
  const canRead = canRevealPrivatePost({
    isPrivate: post.isPrivate,
    authorId: post.authorId,
    viewerId: viewer?.id,
    isAdmin: Boolean(viewer?.isAdmin),
    unlocked,
  });

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
          {post.isPaid ? <Badge>유료 고정</Badge> : null}
          {post.bannerSlot ? <Badge>배너 {post.bannerSlot}구좌</Badge> : null}
          {post.isPrivate ? <Badge variant="outline">비밀글</Badge> : null}
        </div>
        <h1 className="article-title">{post.title}</h1>
      </header>
      <div className="article-meta">
        <AuthorChip author={post.author} anonymous={false} size="md" />
        {post.boardType === "JOBS" && (viewer?.id === post.authorId || viewer?.isAdmin) ? (
          <Link href={`/posts/${post.id}/edit`} className="text-sm font-semibold text-primary">
            수정
          </Link>
        ) : null}
        <div className="article-meta-side">
          <time dateTime={post.createdAt.toISOString()}>{formatPostDateTime(post.createdAt)}</time>
          <span>조회 {(post.viewCount + (canRead ? 1 : 0)).toLocaleString()}</span>
        </div>
      </div>

      {post.isPrivate && !canRead ? (
        <div className="p-4">
          <UnlockPostForm postId={post.id} />
        </div>
      ) : null}

      {canRead ? (
        <div className="article-body">
      {post.jobKind ? <JobFacts job={post} /> : null}

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

      {post.jobKind && (viewer?.id === post.authorId || viewer?.isAdmin) ? (
        <HireButton postId={post.id} filled={post.jobFilled} />
      ) : post.jobFilled ? (
        <p className="text-sm text-primary">
          {post.jobKind === "SEEKING" ? "구직이 마감된 글입니다." : "채용이 완료된 공고입니다."}
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

      {post.content ? <div className="article-copy">{post.content}</div> : null}
        </div>
      ) : null}

      {canRead ? (
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
            <Link href="/login" className="font-medium text-primary underline">
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
