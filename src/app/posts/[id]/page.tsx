import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { HandViewer } from "@/components/hand/hand-viewer";
import { CommentForm } from "@/components/posts/comment-form";
import { prisma } from "@/lib/db";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { parseHandReview } from "@/lib/hand-review";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let post = null;
  try {
    post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { nickname: true } },
        comments: {
          where: { isAttendanceCheck: false },
          include: { author: { select: { nickname: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } catch {
    post = null;
  }
  if (!post) notFound();
  if (post.isAttendanceThread) redirect("/attendance");

  const hand = parseHandReview(post.handReviewJson);

  return (
    <article className="flex flex-col gap-4">
      <header className="rounded-xl border border-border bg-card p-4">
        <Badge variant="secondary">
          {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
        </Badge>
        <h1 className="mt-2 text-2xl font-semibold">{post.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {post.author?.nickname ?? "익명"} · 추천 {post.upvoteCount} · 비추 {post.downvoteCount}
        </p>
      </header>
      {hand ? <HandViewer hand={hand} /> : null}
      {post.content ? (
        <div className="rounded-xl border border-border bg-card p-4 text-[15px] leading-7 whitespace-pre-wrap">
          {post.content}
        </div>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">댓글 {post.comments.length}</h2>
        <CommentForm
          postId={post.id}
          submitLabel="댓글 등록"
          placeholder="라인 피드백을 남겨 주세요."
        />
        {post.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {post.comments.map((comment) => (
              <li key={comment.id} className="px-3 py-3">
                <p className="text-sm font-medium">{comment.author?.nickname ?? "익명"}</p>
                <p className="mt-1 text-sm">{comment.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
