import { PromoBanners } from "@/components/home/promo-banners";
import { PostList, type PostSummary } from "@/components/posts/post-list";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { prisma } from "@/lib/db";
import { BOARD_NAV } from "@/lib/nav";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let posts: PostSummary[] = [];
  try {
    const rows = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      where: { isAttendanceThread: false, hidden: false },
      include: { author: { select: AUTHOR_SELECT } },
    });
    posts = rows.map((post) => ({
      id: post.id,
      boardType: post.boardType,
      title: post.title,
      author: post.author,
      upvoteCount: post.upvoteCount,
      createdAt: post.createdAt.toISOString(),
      ratingManner: post.ratingManner,
      ratingService: post.ratingService,
      ratingFacility: post.ratingFacility,
      ratingAtmosphere: post.ratingAtmosphere,
    }));
  } catch {
    posts = [];
  }

  return (
    <div className="flex flex-col gap-8">
      <PromoBanners />
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 글</h2>
          <Link
            href="/boards/free"
            className="touch-target inline-flex min-h-11 items-center text-sm text-primary"
          >
            딜러 커뮤니티
          </Link>
        </div>
        <PostList posts={posts} emptyText="아직 게시글이 없습니다." showBoard />
      </section>
      <section className="lg:hidden">
        <h2 className="mb-2 text-lg font-semibold">게시판 바로가기</h2>
        <div className="grid grid-cols-2 gap-2">
          {BOARD_NAV.flatMap((group) =>
            group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="touch-target flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-3 text-center text-sm font-medium"
              >
                {item.label}
              </Link>
            )),
          )}
        </div>
      </section>
    </div>
  );
}
