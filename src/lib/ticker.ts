import { prisma } from "@/lib/db";
import { weekStartKst } from "@/lib/dates";
import { POPULAR_UPVOTE_THRESHOLD, WEEKLY_HAND_EXP } from "@/lib/rewards";
import { isSeedCatalogNickname, tickerMentionsSeedCatalog } from "@/lib/purge-demo-catalog";

export async function pushTicker(entry: { kind: string; message: string; href: string }) {
  try {
    return await prisma.tickerEvent.upsert({
      where: { kind: entry.kind },
      create: entry,
      update: { message: entry.message, href: entry.href },
    });
  } catch {
    return null;
  }
}

export async function ensureWeeklyBestHand() {
  const week = weekStartKst();
  const kind = `WEEKLY_HAND:${week}`;
  const existing = await prisma.tickerEvent.findUnique({ where: { kind } });
  if (existing) return;

  const best = await prisma.post.findFirst({
    where: { boardType: "HAND_REVIEW", hidden: false, isAttendanceThread: false },
    orderBy: [{ upvoteCount: "desc" }, { viewCount: "desc" }],
    include: { author: { select: { nickname: true } } },
  });
  if (!best?.author || best.upvoteCount < 1) return;
  if (isSeedCatalogNickname(best.author.nickname)) return;

  const { grantRewards } = await import("@/lib/exp");
  if (best.authorId) {
    await grantRewards(best.authorId, WEEKLY_HAND_EXP, 40);
  }
  await pushTicker({
    kind,
    message: `♠️ ${best.author.nickname}님의 핸드리뷰가 주간 '최고의 분석글'로 선정되어 +${WEEKLY_HAND_EXP.toLocaleString()} EXP를 획득하셨습니다!`,
    href: `/posts/${best.id}`,
  });
}

export async function getTickerEvents() {
  try {
    const rows = await prisma.tickerEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    return rows.filter((row) => !tickerMentionsSeedCatalog(row.message));
  } catch {
    return [];
  }
}

export async function maybePopularPost(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: { select: { nickname: true } } },
  });
  if (!post?.author || post.upvoteCount < POPULAR_UPVOTE_THRESHOLD || post.hidden) return;
  if (isSeedCatalogNickname(post.author.nickname)) return;
  await pushTicker({
    kind: `POPULAR:${post.id}`,
    message: `⭐ ${post.author.nickname}님의 [${post.title}]이 인기 게시물로 선정되었습니다!`,
    href: `/posts/${post.id}`,
  });
}
