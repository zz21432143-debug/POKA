import { notFound } from "next/navigation";
import { MarkImage } from "@/components/layout/profile-widget";
import { PostList } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const decoded = decodeURIComponent(nickname);
  const user = await prisma.user.findUnique({ where: { nickname: decoded } });
  if (!user) notFound();

  const posts = await prisma.post.findMany({
    where: { authorId: user.id, hidden: false, isAttendanceThread: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: { nickname: true, profileMarkImageUrl: true, level: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <MarkImage src={user.profileMarkImageUrl} alt={user.nickname} size={56} />
        <div>
          <h1 className="text-2xl font-semibold">{user.nickname}</h1>
          <p className="text-sm text-muted-foreground">
            Lv.{user.level}
            {user.isDealerVerified ? " · 인증 딜러" : ""} · 연속 출석 {user.attendanceStreak}일
          </p>
        </div>
      </header>
      <PostList
        posts={posts.map((post) => ({
          id: post.id,
          boardType: post.boardType,
          title: post.title,
          author: post.author,
          upvoteCount: post.upvoteCount,
          createdAt: post.createdAt.toISOString(),
        }))}
        emptyText="작성한 글이 없습니다."
        showBoard
      />
    </div>
  );
}
