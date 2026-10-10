import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { PostList } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ nickname: string }> }): Promise<Metadata> {
  const { nickname } = await params;
  return { title: `${safeDecode(nickname)} 님의 글` };
}

export default async function MemberPostsPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const decoded = decodeURIComponent(nickname);
  const user = await prisma.user.findUnique({
    where: { nickname: decoded },
    select: { id: true, nickname: true, withdrawnAt: true },
  });
  if (!user || user.withdrawnAt) notFound();

  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      hidden: false,
      isAttendanceThread: false,
      boardType: { not: "ANONYMOUS_REVIEW" },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { author: { select: AUTHOR_SELECT } },
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href={`/u/${encodeURIComponent(user.nickname)}`} className="font-semibold text-primary">
            {user.nickname}
          </Link>
          님의 작성 글
        </p>
        <h1 className="text-2xl font-semibold">작성 글 보기</h1>
      </header>
      <PostList
        posts={posts.map((post) => ({
          id: post.id,
          boardType: post.boardType,
          title: post.title,
          author: post.author,
          upvoteCount: post.upvoteCount,
          createdAt: post.createdAt.toISOString(),
          viewCount: post.viewCount,
          commentCount: undefined,
          ratingManner: post.ratingManner,
          ratingService: post.ratingService,
          ratingFacility: post.ratingFacility,
          ratingAtmosphere: post.ratingAtmosphere,
        }))}
        emptyText="작성한 글이 없습니다."
        showBoard
      />
    </div>
  );
}
