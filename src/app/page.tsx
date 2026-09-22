import { HomeHero } from "@/components/home/home-hero";
import { HomeShortcuts } from "@/components/home/home-shortcuts";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let posts: PostSummary[] = [];
  try {
    const rows = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 7,
      where: { isAttendanceThread: false, hidden: false },
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
      ratingManner: post.ratingManner,
      ratingService: post.ratingService,
      ratingFacility: post.ratingFacility,
      ratingAtmosphere: post.ratingAtmosphere,
    }));
  } catch {
    posts = [];
  }

  return (
    <div className="flex flex-col gap-5">
      <HomeHero />
      <HomeShortcuts />
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-semibold">최신 게시글</h2>
          <Link href="/boards/free" className="text-sm text-muted-foreground hover:text-primary">
            전체보기
          </Link>
        </div>
        <PostList posts={posts} emptyText="아직 게시글이 없습니다." showBoard framed={false} />
      </section>
    </div>
  );
}
