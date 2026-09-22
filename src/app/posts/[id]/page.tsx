import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HandViewer } from "@/components/hand/hand-viewer";
import { AUTHOR_SELECT, AuthorChip } from "@/components/posts/author-chip";
import { HandPoll } from "@/components/hand/hand-poll";
import { RatingStamp } from "@/components/reviews/rating-stamp";
import { REVIEW_AXES } from "@/lib/ratings";
import { POLL_CHOICES } from "@/lib/poll";
import { CommentForm } from "@/components/posts/comment-form";
import { CommentThread } from "@/components/posts/comment-thread";
import { HireButton } from "@/components/jobs/hire-button";
import { ReportButton } from "@/components/posts/report-button";
import { VoteButtons } from "@/components/posts/vote-buttons";
import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { parseHandReview } from "@/lib/hand-review";
import { getCurrentUser } from "@/lib/current-user";
import { isAnonymousBoard } from "@/lib/request";
import { JOB_KIND_LABEL } from "@/lib/nav";
import { JobFacts } from "@/components/jobs/job-facts";
import { ContactReveal } from "@/components/jobs/contact-reveal";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
  if (post.isAttendanceThread) redirect("/attendance");
  if (post.hidden && !viewer?.isAdmin) notFound();

  void prisma.post
    .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  const anonymous = isAnonymousBoard(post.boardType);
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
      <header className="rounded-xl border border-border bg-card p-4">
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
        </div>
        <div className="mt-2 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-semibold">{post.title}</h1>
          {post.boardType === "ANONYMOUS_REVIEW" ? (
            <RatingStamp
              ratings={{
                ratingManner: post.ratingManner,
                ratingService: post.ratingService,
                ratingFacility: post.ratingFacility,
                ratingAtmosphere: post.ratingAtmosphere,
              }}
            />
          ) : null}
        </div>
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
          <AuthorChip author={post.author} anonymous={anonymous} size="lg" />
          {post.boardType === "JOBS" && (viewer?.id === post.authorId || viewer?.isAdmin) ? (
            <Link href={`/posts/${post.id}/edit`} className="mt-2 inline-block text-sm text-primary">
              수정
            </Link>
          ) : null}
        </div>
      </header>

      {post.jobKind ? <JobFacts job={post} /> : null}

      <GoogleAdUnit placement="post-top" />

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

      {post.boardType === "ANONYMOUS_REVIEW" &&
      (post.ratingManner || post.ratingService || post.ratingFacility || post.ratingAtmosphere) ? (
        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-4">
          {REVIEW_AXES.map((axis) => (
            <div key={axis.key}>
              <dt className="text-xs text-muted-foreground">{axis.label}</dt>
              <dd className="text-primary">
                {"★".repeat(post[axis.key] ?? 0)}
                {"☆".repeat(5 - (post[axis.key] ?? 0))}
                <span className="ml-1 text-foreground">{post[axis.key] ?? "—"}</span>
              </dd>
            </div>
          ))}
        </dl>
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
        <div className="rounded-xl border border-border bg-card p-4 text-[15px] leading-7 whitespace-pre-wrap">
          {post.content}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-3">
        <VoteButtons
          postId={post.id}
          upvoteCount={post.upvoteCount}
          downvoteCount={post.downvoteCount}
          initialVote={myVote}
        />
        {anonymous ? <ReportButton postId={post.id} /> : null}
      </div>

      <GoogleAdUnit placement="post-bottom" />
      {anonymous ? (
        <p className="text-xs text-muted-foreground">
          이 글은 익명입니다. 신고 시 운영자가 내부 계정/IP를 확인할 수 있습니다.
          {post._count.reports ? ` 현재 신고 ${post._count.reports}건.` : ""}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">댓글 {post.comments.length}</h2>
        <CommentForm
          postId={post.id}
          submitLabel="댓글 등록"
          placeholder="댓글을 남겨 주세요. EXP가 지급됩니다."
        />
        {post.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
        ) : (
          <CommentThread
            anonymous={anonymous}
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
    </article>
  );
}
