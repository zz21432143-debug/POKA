import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";

export const metadata: Metadata = { title: "검색", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  let posts: PostSummary[] = [];
  if (query) {
    const rows = await prisma.post.findMany({
      where: {
        hidden: false,
        isAttendanceThread: false,
        boardType: { not: "ANONYMOUS_REVIEW" },
        OR: [
          { title: { contains: query } },
          { AND: [{ isPrivate: false }, { content: { contains: query } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { comments: true } },
      },
    });
    posts = rows.map((post) => ({
      id: post.id,
      boardType: post.boardType,
      title: post.title,
      author: post.author,
      upvoteCount: post.upvoteCount,
      createdAt: post.createdAt.toISOString(),
      viewCount: post.viewCount,
      commentCount: post._count.comments,
      isPrivate: post.isPrivate,
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>검색</h1>
        <form action="/search" className="mt-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="검색어를 입력하세요."
            className="ink-field h-11 w-full rounded-full px-4 text-sm outline-none focus:border-[#C59B27] focus:ring-2 focus:ring-[#C59B27]/30"
          />
        </form>
      </header>
      {query ? (
        <PostList posts={posts} emptyText={`‘${query}’ 검색 결과가 없습니다.`} showBoard />
      ) : (
        <p className="ink-panel rounded-2xl px-4 py-10 text-center text-sm text-[#D1D5DB]">
          제목이나 본문으로 글을 찾아보세요.{" "}
          <Link href="/boards/free" className="text-primary">
            자유 게시판
          </Link>
        </p>
      )}
    </div>
  );
}
