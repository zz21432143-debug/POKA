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
  compact = false,
  nativeSponsor = null,
}: {
  posts: PostSummary[];
  emptyText: string;
  showBoard?: boolean;
  framed?: boolean;
  compact?: boolean;
  nativeSponsor?: DirectCreative | null;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-border bg-white px-4 py-10 text-center text-sm text-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ul
      className={
        framed
          ? "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          : "divide-y divide-border"
      }
    >
      {posts.map((post, index) => {
        const anonymous = isAnonymousBoard(post.boardType);
        return (
          <Fragment key={post.id}>
            {index === 3 ? <SponsoredPostLine unit={nativeSponsor} /> : null}
            <li
              className={
                compact
                  ? "flex min-h-11 items-center gap-2.5 px-4 py-2 even:bg-[#f7f1e6] hover:bg-[#e7f4ea]"
                  : "flex min-h-14 items-center gap-3 px-4 py-3.5 even:bg-[#f7f1e6] hover:bg-[#e7f4ea]"
              }
            >
              {showBoard ? (
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 rounded-full bg-[#0d3b24] px-2 text-[10px] font-semibold text-emerald-100"
                >
                  {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
                </Badge>
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/posts/${post.id}`}
                  className={
                    compact
                      ? "touch-target relative z-10 block truncate py-0.5 text-[13px] font-semibold leading-snug text-foreground"
                      : "touch-target relative z-10 block break-words py-0.5 text-[17px] font-bold leading-snug text-foreground sm:text-lg"
                  }
                >
                  {post.isPrivate ? (
                    <span className="mr-1.5 align-middle rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                      비밀글
                    </span>
                  ) : null}
                  {post.title}
                </Link>
                {compact ? (
                  <p className="truncate text-[11px] text-[#8a7f6c]">
                    {anonymous ? "익명" : post.author.nickname} · {formatRelativeKst(post.createdAt)}
                  </p>
                ) : (
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                    <AuthorChip author={post.author} anonymous={anonymous} size="sm" />
                    <span className="text-xs font-medium text-slate-600">{formatRelativeKst(post.createdAt)}</span>
                  </div>
                )}
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
                <div
                  className={
                    compact
                      ? "hidden shrink-0 items-center gap-2 text-[11px] text-[#8a7f6c] sm:flex"
                      : "hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex"
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    <EyeIcon className="size-3.5" />
                    {post.viewCount ?? 0}
                  </span>
                  {compact ? null : (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircleIcon className="size-3.5" />
                      {post.commentCount ?? 0}
                    </span>
                  )}
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
