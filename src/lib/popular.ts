import { prisma } from "@/lib/db";
import { publicPostWhere } from "@/lib/posts";

export async function getPopularPosts(limit = 5) {
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
