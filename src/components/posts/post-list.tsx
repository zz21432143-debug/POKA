import Link from "next/link";
import { EyeIcon, MessageCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RatingStamp } from "@/components/reviews/rating-stamp";
import { AuthorChip, type PublicAuthor } from "@/components/posts/author-chip";
import { MarkImage } from "@/components/layout/mark-image";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { isAnonymousBoard } from "@/lib/request";
import { formatRelativeKst } from "@/lib/dates";
import { memberRankTitle } from "@/lib/levels";
import { displayMarkSrc } from "@/lib/mark-assets";
import { CrownedFrame } from "@/components/honor/crowned-frame";
import { auraClassForSrc } from "@/lib/yokai-achievements";
import { isWithdrawnRecord, withdrawnDisplayName } from "@/lib/account-privacy";
import { Fragment } from "react";
import { SponsoredPostLine } from "@/components/ads/sponsored-post-line";
import type { DirectCreative } from "@/lib/inventory-policy";
import { cn } from "cn";

function boardBadgeClass(board: string) {
  if (board === "FREE") return "bg-primary text-white";
  if (board === "HAND_REVIEW") return "bg-[#2563eb] text-white";
  if (board === "PROMO" || board === "OFFICIAL_POSTER" || board === "EVENT_POSTER") {
    return "border border-[#e2c36a] bg-[#f6edd4] text-[#8a6a2a]";
  }
  if (board === "JOBS" || board === "PICKUP" || board === "TALENT") return "bg-[#5a2a1e] text-white";
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

  if (framed) {
    return (
      <BoardSheet posts={posts} showBoard={showBoard} nativeSponsor={nativeSponsor} />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {posts.map((post, index) => {
        const anonymous = isAnonymousBoard(post.boardType);
        return (
          <Fragment key={post.id}>
            {index === 3 ? <SponsoredPostLine unit={nativeSponsor} /> : null}
            <li
              className={
                compact
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
                  <p className="flex min-w-0 items-center gap-1.5 truncate text-[11px] text-[#8a7f6c]">
                    <span className="truncate">{anonymous || !post.author ? "익명" : post.author.nickname}</span>
                    {!anonymous && post.author ? (
                      <span className="shrink-0 rounded bg-[#c86d2a]/12 px-1 text-[10px] font-bold text-[#a8561f]">
                        Lv.{post.author.level}
                      </span>
                    ) : null}
                    <span className="shrink-0">{formatRelativeKst(post.createdAt)}</span>
                  </p>
                ) : (
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                    <AuthorChip author={post.author} anonymous={anonymous} size="sm" />
                    <span className="text-xs font-medium text-[#6d5844]">
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
                      ? "hidden shrink-0 items-center gap-2 text-[11px] text-[#8a7f6c] sm:flex"
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

function BoardSheet({
  posts,
  showBoard,
  nativeSponsor,
}: {
  posts: PostSummary[];
  showBoard: boolean;
  nativeSponsor: DirectCreative | null;
}) {
  return (
    <div className="board-sheet">
      <div className="board-head" role="row">
        <span>제목</span>
        <span>작성자</span>
        <span>작성일</span>
        <span>조회</span>
        <span>추천</span>
      </div>
      <ul>
        {posts.map((post, index) => {
          const anonymous = isAnonymousBoard(post.boardType);
          const comments = post.commentCount ?? 0;
          return (
            <Fragment key={post.id}>
              {index === 3 ? <SponsoredPostLine unit={nativeSponsor} /> : null}
              <li className="board-row">
                <Link href={`/posts/${post.id}`} className="board-row-hit" aria-label={post.title} />
                <div className="board-title">
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
                  {post.isPrivate ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                      비밀글
                    </span>
                  ) : null}
                  <span className="board-title-text">{post.title}</span>
                  {comments > 0 ? <span className="board-comments">[{comments}]</span> : null}
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
                </div>
                <BoardAuthor post={post} anonymous={anonymous} />
                <span className="board-when">{formatRelativeKst(post.createdAt)}</span>
                <span className="board-stat">
                  <span className="board-stat-label">조회</span>
                  {post.viewCount ?? 0}
                </span>
                <span className="board-stat">
                  <span className="board-stat-label">추천</span>
                  {post.upvoteCount}
                </span>
              </li>
            </Fragment>
          );
        })}
        {posts.length > 0 && posts.length < 4 ? <SponsoredPostLine unit={nativeSponsor} /> : null}
      </ul>
    </div>
  );
}

function BoardAuthor({ post, anonymous }: { post: PostSummary; anonymous: boolean }) {
  if (anonymous || !post.author || isWithdrawnRecord(post.author)) {
    return (
      <span className="board-author">
        <span className="board-author-name">{anonymous || !post.author ? "익명" : withdrawnDisplayName()}</span>
      </span>
    );
  }
  const rank = memberRankTitle(post.author);
  return (
    <span className="board-author">
      <CrownedFrame nickname={post.author.nickname} aura={auraClassForSrc(displayMarkSrc(post.author))}>
        <MarkImage src={displayMarkSrc(post.author)} alt="" size={48} />
      </CrownedFrame>
      <span className="board-author-copy">
        <span className="board-author-name">{post.author.nickname}</span>
        <span className="board-author-rank">{rank ? `${rank} · Lv.${post.author.level}` : `Lv.${post.author.level}`}</span>
      </span>
    </span>
  );
}
