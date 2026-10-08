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
import { cn } from "cn";

function boardBadgeClass(board: string) {
  if (board === "FREE") return "bg-[#8e2430] text-white";
  if (board === "HAND_REVIEW") return "bg-[#2563eb] text-white";
  if (board === "PROMO" || board === "OFFICIAL_POSTER" || board === "EVENT_POSTER") {
    return "border border-[#e2c36a] bg-[#f6edd4] text-[#8a6a2a]";
  }
  if (board === "JOBS" || board === "PICKUP" || board === "TALENT") return "bg-[#8e2430] text-white";
  return "bg-[#efe4cc] text-[#5c4a2a]";
}

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
      <p
        className={
          framed
            ? "ink-panel rounded-2xl px-4 py-10 text-center text-base text-[#D1D5DB]"
            : "px-4 py-10 text-center text-sm text-muted-foreground"
        }
      >
        {emptyText}
      </p>
    );
  }

  return (
    <ul
      className={
        framed
          ? "ink-panel divide-y divide-[#3a332c] overflow-hidden rounded-2xl"
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
                framed
                  ? compact
                    ? "flex min-h-11 items-center gap-2.5 bg-[#1C1819] px-4 py-2 hover:bg-[#241c1e]"
                    : "flex min-h-14 items-center gap-3 bg-[#1C1819] px-4 py-3.5 hover:bg-[#241c1e]"
                  : compact
                    ? "flex min-h-11 items-center gap-2.5 px-4 py-2 even:bg-[#f7f1e6] hover:bg-[#efe6d6]"
                    : "flex min-h-14 items-center gap-3 px-4 py-3.5 even:bg-[#f7f1e6] hover:bg-[#efe6d6]"
              }
            >
              {showBoard ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-5 shrink-0 rounded-full px-2 text-[10px] font-semibold",
                    boardBadgeClass(post.boardType),
                  )}
                >
                  {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
                </Badge>
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/posts/${post.id}`}
                  className={
                    framed
                      ? compact
                        ? "touch-target relative z-10 block truncate py-0.5 text-[13px] font-semibold leading-snug text-white hover:text-white"
                        : "touch-target relative z-10 block break-words py-0.5 text-[17px] font-bold leading-snug text-white hover:text-white sm:text-lg"
                      : compact
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
                  <p
                    className={
                      framed
                        ? "flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[#9CA3AF]"
                        : "flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[#8a7f6c]"
                    }
                  >
                    <span className="truncate">{anonymous || !post.author ? "익명" : post.author.nickname}</span>
                    {!anonymous && post.author ? (
                      <span
                        className={
                          framed
                            ? "shrink-0 rounded bg-[#C59B27]/15 px-1 text-[10px] font-bold text-[#C59B27]"
                            : "shrink-0 rounded bg-[#c86d2a]/12 px-1 text-[10px] font-bold text-[#a8561f]"
                        }
                      >
                        Lv.{post.author.level}
                      </span>
                    ) : null}
                    <span className="shrink-0">{formatRelativeKst(post.createdAt)}</span>
                  </p>
                ) : (
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                    <AuthorChip author={post.author} anonymous={anonymous} size="sm" />
                    <span className={framed ? "text-xs font-medium text-[#9CA3AF]" : "text-xs font-medium text-[#6d5844]"}>
                      {formatRelativeKst(post.createdAt)}
                    </span>
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
                      ? framed
                        ? "hidden shrink-0 items-center gap-2 text-[11px] text-[#9CA3AF] sm:flex"
                        : "hidden shrink-0 items-center gap-2 text-[11px] text-[#8a7f6c] sm:flex"
                      : framed
                        ? "hidden shrink-0 items-center gap-3 text-xs text-[#9CA3AF] sm:flex"
                        : "hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex"
                  }
                >
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
