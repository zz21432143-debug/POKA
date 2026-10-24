import Link from "@/components/ui/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { normalizeHand } from "@/lib/hand-review";
import { HandPoll } from "@/components/hand/hand-poll";
import { CardChips } from "@/components/study/card-text";
import { nowMs } from "@/lib/dates";

/**
 * 홈 「이번 주의 핸드 문제」: 최근 7일 핸드리뷰 중 투표가 가장 많은 글(없으면 가장 최근) — 홈에서 바로 투표 · 해설은 글에서.
 */
export async function HomeHandWeek() {
  const since = new Date(nowMs() - 7 * 86_400_000);
  const recent = await prisma.post
    .findMany({
      where: { boardType: "HAND_REVIEW", hidden: false, handReviewJson: { not: null }, createdAt: { gte: since } },
      select: { id: true, title: true, handReviewJson: true, _count: { select: { pollVotes: true, comments: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    .catch(() => []);
  const fallback = recent.length
    ? []
    : await prisma.post
        .findMany({
          where: { boardType: "HAND_REVIEW", hidden: false, handReviewJson: { not: null } },
          select: { id: true, title: true, handReviewJson: true, _count: { select: { pollVotes: true, comments: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        })
        .catch(() => []);
  const pick = [...recent].sort((a, b) => b._count.pollVotes - a._count.pollVotes)[0] ?? fallback[0];
  if (!pick?.handReviewJson) return null;
  let hand: ReturnType<typeof normalizeHand>;
  try {
    hand = normalizeHand(JSON.parse(pick.handReviewJson));
  } catch {
    return null;
  }
  const user = await getCurrentUser().catch(() => null);
  const [rows, mine] = await Promise.all([
    prisma.handPollVote.groupBy({ by: ["choice"], where: { postId: pick.id }, _count: { _all: true } }).catch(() => []),
    user ? prisma.handPollVote.findFirst({ where: { postId: pick.id, userId: user.id }, select: { choice: true } }).catch(() => null) : null,
  ]);
  const counts: Record<string, number> = Object.fromEntries(rows.map((r) => [r.choice, r._count._all]));
  const title = pick.title.replace(/^홀덤\s*핸드리뷰\s*\|\s*/, "");
  return (
    <section data-home-hand-week aria-label="이번 주의 핸드 문제" className="lounge-card grid gap-2.5 rounded-[1.35rem] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#c9a25c] px-2.5 py-0.5 text-xs font-black text-[#1d1611]">이번 주의 핸드 문제</span>
        <span className="text-xs text-[#a89c88]">투표 {pick._count.pollVotes} · 댓글 {pick._count.comments}</span>
        <Link href={`/posts/${pick.id}`} className="ml-auto text-sm font-bold text-[#e7c98a]">
          전체 핸드 · 해설 보기 ›
        </Link>
      </div>
      <Link href={`/posts/${pick.id}`} className="text-base font-black leading-snug text-white hover:text-[#f3d9a4]">
        {title}
      </Link>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#d9cfbd]">
        {hand.heroCards.length === 2 ? (
          <span className="flex items-center gap-1">
            {hand.heroPosition} 내 패 <CardChips codes={hand.heroCards} />
          </span>
        ) : null}
        {hand.board.length ? (
          <span className="flex items-center gap-1">
            보드 <CardChips codes={hand.board} />
          </span>
        ) : null}
      </p>
      <HandPoll postId={pick.id} initialCounts={counts} initialChoice={mine?.choice ?? null} />
    </section>
  );
}
