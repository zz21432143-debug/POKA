import { notFound, redirect } from "next/navigation";
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
import { JOB_KIND_LABEL } from "@/lib/nav";
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

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer) redirect(`/login?next=${encodeURIComponent(`/posts/${id}`)}`);
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
      <article className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">익명 게시판 종료</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          익명 게시판은 운영을 종료했습니다. 기존 글은 더 이상 공개하지 않습니다.
        </p>
        <Link href="/community" className="mt-4 inline-flex text-sm font-semibold text-primary">
          커뮤니티로
        </Link>
      </article>
    );
  }
  if (post.isAttendanceThread) redirect("/attendance");
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

  return (
    <article className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <header className="border-b border-border px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
          </Badge>
          {post.jobKind ? (
            <Badge variant="outline">
              {JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL]}
            </Badge>
          ) : null}
          {post.isPaid ? <Badge>유료 고정</Badge> : null}
          {post.bannerSlot ? <Badge>배너 {post.bannerSlot}구좌</Badge> : null}
          {post.isPrivate ? <Badge variant="outline">비밀글</Badge> : null}
        </div>
        <h1 className="mt-3 min-w-0 break-words text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-4">
          <AuthorChip author={post.author} anonymous={false} size="lg" />
          {post.boardType === "JOBS" && (viewer?.id === post.authorId || viewer?.isAdmin) ? (
            <Link href={`/posts/${post.id}/edit`} className="mt-2 inline-block text-sm font-semibold text-primary">
              수정
            </Link>
          ) : null}
        </div>
      </header>

      {post.isPrivate && !canRead ? (
        <div className="p-4">
          <UnlockPostForm postId={post.id} />
        </div>
      ) : null}

      {canRead ? (
        <div className="flex flex-col gap-4 p-4 sm:p-6">
      {post.jobKind ? <JobFacts job={post} /> : null}

      {post.boardType === "SCHEDULE" ? (
        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">개최 장소</dt>
            <dd>{post.promoLocation || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">일정</dt>
            <dd>
              {post.eventDate || "—"}
              {post.eventEndDate && post.eventEndDate !== post.eventDate ? ` ~ ${post.eventEndDate}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">총상금</dt>
            <dd>{post.eventPrize || "—"}</dd>
          </div>
          {post.eventLink ? (
            <div className="col-span-full">
              <dt className="text-xs text-muted-foreground">공식 링크</dt>
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
        <section className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">연락처</p>
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

      {post.content ? (
        <div className="overflow-x-clip rounded-xl border border-border bg-slate-50 px-4 py-4 text-[17px] leading-8 break-words whitespace-pre-wrap text-foreground sm:px-5">
          {post.content}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-3 border-t border-border pt-4">
        <VoteButtons
          postId={post.id}
          upvoteCount={post.upvoteCount}
          downvoteCount={post.downvoteCount}
          initialVote={myVote}
        />
        <ReportButton targetType="post" targetId={post.id} />
      </div>
        </div>
      ) : null}
      </div>

      {canRead ? (
        <>
      <GoogleAdUnit placement="post-top" />

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <h2 className="border-b border-border pb-3 text-lg font-bold">댓글 {post.comments.length}</h2>
        {viewer ? (
          <CommentForm
            postId={post.id}
            submitLabel="댓글 등록"
            placeholder={`댓글을 남겨 주세요. ${commentRewardLine()}가 지급됩니다.`}
          />
        ) : (
          <p className="rounded-xl border border-border bg-muted px-3 py-3 text-sm text-foreground">
            댓글은 로그인 후 남길 수 있습니다. {commentRewardLine()}가 지급됩니다.{" "}
            <Link href="/login" className="font-medium text-primary underline">
              로그인
            </Link>
          </p>
        )}
        {post.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
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
      <GoogleAdUnit placement="post-bottom" />
        </>
      ) : null}
    </article>
  );
}
