import { prisma } from "@/lib/db";
import { weekStartKst } from "@/lib/dates";
import { popularTickerMessage, withCurrentTitle } from "@/lib/ticker-text";
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

/**
 * 닉네임을 바꾸거나 탈퇴하면 예전 닉네임이 담긴 전광판 소식을 지웁니다.
 * (예전 이름이 계속 흐르거나, 없는 프로필로 가는 링크가 남지 않게)
 */
export async function forgetTickerName(nickname: string) {
  const name = nickname.trim();
  if (!name) return;
  try {
    await prisma.tickerEvent.deleteMany({
      where: {
        OR: [
          { message: { contains: `${name}님` } },
          // 짧은 형식("📝 [게시판] 제목 · 닉네임")
          { message: { endsWith: ` · ${name}` } },
          { href: `/u/${encodeURIComponent(name)}` },
        ],
      },
    });
  } catch {
    // 전광판 정리는 실패해도 본 작업은 계속합니다.
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
      // 예전 가입 소식(실명일 수 있음)은 내보내지 않습니다.
      where: { NOT: { kind: { startsWith: "JOIN:" } } },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    // 글 소식은 지금 글 제목으로 다시 씁니다(예전 28자 잘림·수정된 제목 반영). 지워졌거나 숨긴 글은 뺍니다.
    const postIds = rows
      .map((row) => /^(?:POST|POPULAR):(.+)$/.exec(row.kind)?.[1])
      .filter((id): id is string => Boolean(id));
    const posts = postIds.length
      ? await prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true, hidden: true } })
      : [];
    const byId = new Map(posts.map((post) => [post.id, post]));
    return rows
      .filter((row) => !tickerMentionsSeedCatalog(row.message))
      .flatMap((row) => {
        const match = /^(POST|POPULAR):(.+)$/.exec(row.kind);
        if (!match) return [row];
        const post = byId.get(match[2]);
        if (!post || post.hidden) return [];
        return [{ ...row, message: withCurrentTitle(row.message, post.title, match[1] as "POST" | "POPULAR") }];
      });
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
    message: popularTickerMessage(post.author.nickname, post.title),
    href: `/posts/${post.id}`,
  });
}
