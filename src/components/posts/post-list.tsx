import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AdSlot } from "@/components/ads/ad-slot";
import { RatingStamp } from "@/components/reviews/rating-stamp";
import { AuthorChip, type PublicAuthor } from "@/components/posts/author-chip";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { isAnonymousBoard } from "@/lib/request";
import { Fragment } from "react";

export type PostSummary = {
  id: string;
  boardType: string;
  title: string;
  author: PublicAuthor;
  upvoteCount: number;
  createdAt: string;
  ratingManner?: number | null;
  ratingService?: number | null;
  ratingFacility?: number | null;
  ratingAtmosphere?: number | null;
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
      {posts.map((post, index) => (
        <Fragment key={post.id}>
          {index === 3 ? (
            <li>
              <AdSlot placement="infeed" />
            </li>
          ) : null}
          <li>
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
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <AuthorChip author={post.author} anonymous={isAnonymousBoard(post.boardType)} />
                  <span>추천 {post.upvoteCount}</span>
                </div>
              </div>
              {post.boardType === "ANONYMOUS_REVIEW" ? (
                <RatingStamp
                  size="sm"
                  ratings={{
                    ratingManner: post.ratingManner ?? null,
                    ratingService: post.ratingService ?? null,
                    ratingFacility: post.ratingFacility ?? null,
                    ratingAtmosphere: post.ratingAtmosphere ?? null,
                  }}
                />
              ) : null}
            </Link>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
