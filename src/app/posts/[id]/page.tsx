import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HandViewer } from "@/components/hand/hand-viewer";
import { AuthorChip } from "@/components/posts/author-chip";
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
import { ListingFacts, isListingPost } from "@/components/listing/listing-facts";
import { ContactReveal } from "@/components/jobs/contact-reveal";
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
      author: { select: { nickname: true, profileMarkImageUrl: true, level: true } },
      comments: {
        where: { isAttendanceCheck: false },
        include: {
          author: { select: { nickname: true, profileMarkImageUrl: true, level: true } },
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

  return (
    <article className="flex flex-col gap-4">
      <header className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
          </Badge>
          {post.jobWorkType ? <Badge variant="outline">{post.jobWorkType}</Badge> : null}
          {post.isPaid ? <Badge>유료 고정</Badge> : null}
          {post.bannerSlot ? <Badge>배너 {post.bannerSlot}구좌</Badge> : null}
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AuthorChip author={post.author} anonymous={anonymous} />
          {post.boardType === "JOBS" && (viewer?.id === post.authorId || viewer?.isAdmin) ? (
            <Link href={`/posts/${post.id}/edit`} className="text-sm text-primary">
              수정
            </Link>
          ) : null}
        </div>
      </header>

      {isListingPost(post) ? <ListingFacts post={post} /> : null}

      {isListingPost(post) && post.jobApplyMethod && post.jobApplyMethod !== "사이트 내 직접 지원" ? (
        <section className="rounded-xl border border-border bg-card p-3">
          <p className="mb-2 text-xs text-muted-foreground">지원 정보</p>
          <ContactReveal
            postId={post.id}
            hasContact={Boolean(post.jobApplyValue || post.jobContact)}
            loggedIn={Boolean(viewer)}
          />
        </section>
      ) : isListingPost(post) && post.jobApplyMethod === "사이트 내 직접 지원" ? (
        <p className="rounded-xl border border-border bg-card px-3 py-3 text-sm">
          사이트 내 직접 지원 — 아래 댓글로 지원하세요.
        </p>
      ) : null}

      {(post.boardType === "JOBS" || post.boardType === "PICKUP") &&
      (viewer?.id === post.authorId || viewer?.isAdmin) ? (
        <HireButton postId={post.id} filled={post.jobFilled} />
      ) : post.jobFilled ? (
        <p className="text-sm text-primary">채용이 완료된 공고입니다.</p>
      ) : null}

      {hand ? <HandViewer hand={hand} /> : null}
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
