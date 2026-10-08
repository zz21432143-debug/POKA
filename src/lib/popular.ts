import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { publicPostWhere } from "@/lib/posts";
import { ttlCache } from "@/lib/ttl-cache";

async function loadPopularPosts(limit: number) {
  try {
    return await prisma.post.findMany({
      where: { ...publicPostWhere, isAttendanceThread: false },
      orderBy: [{ upvoteCount: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        boardType: true,
        upvoteCount: true,
        viewCount: true,
        createdAt: true,
      },
    });
  } catch {
    return [];
  }
}

const cachedPopularPosts = unstable_cache(
  () => loadPopularPosts(5),
  ["poka-popular-posts-5"],
  { revalidate: 60 },
);

export function getPopularPosts(limit = 5) {
  if (limit === 5) {
    return ttlCache("popular-posts:5", 20_000, () => cachedPopularPosts());
  }
  return ttlCache(`popular-posts:${limit}`, 30_000, () => loadPopularPosts(limit));
}
