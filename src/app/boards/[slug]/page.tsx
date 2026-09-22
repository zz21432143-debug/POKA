import Link from "next/link";
import { notFound } from "next/navigation";
import { PostList } from "@/components/posts/post-list";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { BOARD_SLUGS } from "@/lib/nav";
import { POST_EXP } from "@/lib/rewards";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = BOARD_SLUGS[slug as keyof typeof BOARD_SLUGS];
  if (!board) notFound();

  let posts: {
    id: string;
    boardType: string;
    title: string;
    authorNickname: string | null;
    upvoteCount: number;
    createdAt: string;
  }[] = [];
  try {
    const rows = await prisma.post.findMany({
      where: { boardType: board.boardType, isAttendanceThread: false },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { nickname: true } } },
    });
    posts = rows.map((post) => ({
      id: post.id,
      boardType: post.boardType,
      title: post.title,
      authorNickname: post.author?.nickname ?? null,
      upvoteCount: post.upvoteCount,
      createdAt: post.createdAt.toISOString(),
    }));
  } catch {
    posts = [];
  }

  const isHandReview = board.boardType === "HAND_REVIEW";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{board.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isHandReview
              ? `핸드리뷰 작성 시 EXP ${POST_EXP.HAND_REVIEW} (최고 지급)`
              : `글 작성 시 EXP ${POST_EXP[board.boardType]}`}
          </p>
        </div>
        {isHandReview ? (
          <Link
            href="/boards/hand-review/write"
            className={cn(buttonVariants({ size: "touch" }), "inline-flex")}
          >
            핸드리뷰 작성
          </Link>
        ) : null}
      </header>
      <PostList posts={posts} emptyText="이 게시판에 글이 없습니다." />
    </div>
  );
}
