import Link from "next/link";
import { EyeIcon, MessageCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RatingStamp } from "@/components/reviews/rating-stamp";
import { AuthorChip, type PublicAuthor } from "@/components/posts/author-chip";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { isAnonymousBoard } from "@/lib/request";
import { formatRelativeKst } from "@/lib/dates";
import { Fragment } from "react";
import { SponsoredPostLine } from "@/components/ads/sponsored-post-line";
import type { DirectCreative } from "@/lib/inventory-policy";

export type PostSummary = {
  id: string;
  boardType: string;
  title: string;
  author: PublicAuthor;
  upvoteCount: number;
  createdAt: string;
  viewCount?: number;
  commentCount?: number;
  ratingManner?: number | null;
  ratingService?: number | null;
  ratingFacility?: number | null;
  ratingAtmosphere?: number | null;
  isPrivate?: boolean;
};

export function PostList({
  posts,
  emptyText,
  showBoard = false,
  framed = true,
  nativeSponsor = null,
}: {
  posts: PostSummary[];
  emptyText: string;
  showBoard?: boolean;
  framed?: boolean;
  nativeSponsor?: DirectCreative | null;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ul
      className={
        framed
          ? "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white"
          : "divide-y divide-border"
      }
    >
      {posts.map((post, index) => {
        const anonymous = isAnonymousBoard(post.boardType);
        return (
          <Fragment key={post.id}>
            {index === 3 ? <SponsoredPostLine unit={nativeSponsor} /> : null}
            <li className="flex min-h-14 items-center gap-3 px-4 py-3.5 hover:bg-muted/50">
              {showBoard ? (
                <Badge
                  variant="secondary"
                  className="h-6 shrink-0 rounded-full bg-emerald-50 px-2.5 text-[11px] font-medium text-emerald-700"
                >
                  {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
                </Badge>
              ) : null}
              <div className="min-w-0 flex-1">
                <Link href={`/posts/${post.id}`} className="touch-target block break-words font-medium">
                  {post.isPrivate ? (
                    <span className="mr-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                      비밀글
                    </span>
                  ) : null}
                  {post.title}
                </Link>
                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                  <AuthorChip author={post.author} anonymous={anonymous} size="sm" />
                  <span className="text-xs text-muted-foreground">{formatRelativeKst(post.createdAt)}</span>
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
              ) : (
                <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
                  <span className="inline-flex items-center gap-1">
                    <EyeIcon className="size-3.5" />
                    {post.viewCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircleIcon className="size-3.5" />
                    {post.commentCount ?? 0}
                  </span>
                </div>
              )}
            </li>
          </Fragment>
        );
      })}
      {posts.length > 0 && posts.length < 4 ? <SponsoredPostLine unit={nativeSponsor} /> : null}
    </ul>
  );
}
