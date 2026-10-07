import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { publicPostWhere } from "@/lib/posts";

export const getPopularPosts = unstable_cache(
  async (limit = 5) => {
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
  },
  ["popular-posts"],
  { revalidate: 30 },
);
