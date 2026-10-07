import { notFound } from "next/navigation";
import { UserBadge } from "@/components/user/user-badge";
import { AUTHOR_SELECT } from "@/components/posts/author-chip";
import { PostList } from "@/components/posts/post-list";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const decoded = decodeURIComponent(nickname);
  const user = await prisma.user.findUnique({
    where: { nickname: decoded },
    include: {
      equippedFrame: { select: { cssClass: true } },
      equippedEffect: { select: { cssClass: true } },
    },
  });
  if (!user) notFound();
  const viewer = await getCurrentUser().catch(() => null);

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, hidden: false, isAttendanceThread: false, boardType: { not: "ANONYMOUS_REVIEW" } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: AUTHOR_SELECT } },
  });

  return (
    <div className="flex flex-col gap-4">
      <header
        className={
          user.isDealerVerified
            ? "flex flex-col gap-2 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 ring-1 ring-amber-100"
            : "flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
        }
      >
        <h1 className="sr-only">{user.nickname}</h1>
        <UserBadge
          user={{
            nickname: user.nickname,
            profileMarkImageUrl: user.profileMarkImageUrl,
            level: user.level,
            isDealerVerified: user.isDealerVerified,
            isAdmin: user.isAdmin,
            isMaster: user.isMaster,
            attendanceStreak: user.attendanceStreak,
            equippedFrameId: user.equippedFrameId,
            equippedEffectId: user.equippedEffectId,
            equippedFrame: user.equippedFrame,
            equippedEffect: user.equippedEffect,
          }}
          size="lg"
        />
        <p className="text-sm text-muted-foreground">연속 출석 {user.attendanceStreak}일</p>
        {viewer?.isMaster && !user.isMaster ? (
          <VerifyToggle nickname={user.nickname} verified={user.isDealerVerified} />
        ) : null}
      </header>
      <PostList
        posts={posts.map((post) => ({
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
        }))}
        emptyText="작성한 글이 없습니다."
        showBoard
      />
    </div>
  );
}
