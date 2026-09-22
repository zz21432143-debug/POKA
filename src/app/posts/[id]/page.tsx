import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HandViewer } from "@/components/hand/hand-viewer";
import { AuthorChip } from "@/components/posts/author-chip";
import { CommentForm } from "@/components/posts/comment-form";
import { ReportButton } from "@/components/posts/report-button";
import { VoteButtons } from "@/components/posts/vote-buttons";
import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { parseHandReview } from "@/lib/hand-review";
import { getCurrentUser } from "@/lib/current-user";
import { isAnonymousBoard } from "@/lib/request";
import { JOB_KIND_LABEL } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUser().catch(() => null);
  let post = null;
  try {
    post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { nickname: true, profileMarkImageUrl: true, level: true } },
        comments: {
          where: { isAttendanceCheck: false },
          include: { author: { select: { nickname: true, profileMarkImageUrl: true, level: true } } },
          orderBy: { createdAt: "asc" },
        },
        votes: viewer ? { where: { userId: viewer.id } } : false,
        _count: { select: { reports: true } },
      },
    });
  } catch {
    post = null;
  }
  if (!post) notFound();
  if (post.isAttendanceThread) redirect("/attendance");

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
          {post.jobKind ? (
            <Badge variant="outline">
              {JOB_KIND_LABEL[post.jobKind as keyof typeof JOB_KIND_LABEL]}
            </Badge>
          ) : null}
          {post.isPaid ? <Badge>유료 고정</Badge> : null}
          {post.bannerSlot ? <Badge>배너 {post.bannerSlot}구좌</Badge> : null}
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{post.title}</h1>
        <div className="mt-3">
          <AuthorChip author={post.author} anonymous={anonymous} />
        </div>
      </header>

      {post.jobKind ? (
        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">지역</dt>
            <dd>{post.jobLocation || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">조건</dt>
            <dd>{post.jobPay || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">일정</dt>
            <dd>{post.jobSchedule || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">인원</dt>
            <dd>{post.jobHeadcount || "—"}</dd>
          </div>
        </dl>
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
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {post.comments.map((comment) => (
              <li key={comment.id} className="px-3 py-3">
                <AuthorChip author={comment.author} anonymous={anonymous} />
                <p className="mt-1 text-sm">{comment.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
