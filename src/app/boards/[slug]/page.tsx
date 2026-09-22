import { PostList } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";
import { BOARD_SLUGS } from "@/lib/nav";
import { notFound } from "next/navigation";

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
      where: { boardType: board.boardType },
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

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{board.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">글쓰기·추천은 다음 단계에서 연결합니다.</p>
      </header>
      <PostList posts={posts} emptyText="이 게시판에 글이 없습니다." />
    </div>
  );
}
