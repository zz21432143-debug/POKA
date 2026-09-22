import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";

export type PostSummary = {
  id: string;
  boardType: string;
  title: string;
  authorNickname: string | null;
  upvoteCount: number;
  createdAt: string;
};

export function PostList({
  posts,
  emptyText,
  showBoard = false,
}: {
  posts: PostSummary[];
  emptyText: string;
  showBoard?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/posts/${post.id}`}
            className="touch-target flex min-h-12 items-start gap-3 px-3 py-3 hover:bg-muted/60"
          >
            {showBoard ? (
              <Badge variant="secondary" className="mt-0.5 shrink-0">
                {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
              </Badge>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{post.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {post.authorNickname ?? "익명"} · 추천 {post.upvoteCount}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
