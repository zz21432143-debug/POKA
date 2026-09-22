import { SchemaDashboard } from "@/components/schema-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import type { SchemaSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY: SchemaSnapshot = {
  users: [],
  posts: [],
  comments: [],
  levels: [],
  counts: { users: 0, posts: 0, comments: 0, attendance: 0, levels: 0 },
};

export default async function SchemaPage() {
  let data = EMPTY;
  let error: string | null = null;
  const viewer = await getCurrentUser().catch(() => null);
  try {
    const [users, posts, comments, levels, attendance] = await Promise.all([
      prisma.user.findMany({ orderBy: { level: "desc" } }),
      prisma.post.findMany({
        orderBy: { createdAt: "desc" },
        include: { author: { select: { nickname: true } } },
      }),
      prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { nickname: true } },
          post: { select: { title: true } },
        },
      }),
      prisma.levelExp.findMany({ orderBy: { level: "asc" } }),
      prisma.comment.count({ where: { isAttendanceCheck: true } }),
    ]);
    data = {
      users: users.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        profileMarkImageUrl: user.profileMarkImageUrl,
        level: user.level,
        exp: user.exp,
        points: user.points,
        isDealerVerified: user.isDealerVerified,
        createdAt: user.createdAt.toISOString(),
      })),
      posts: posts.map((post) => ({
        id: post.id,
        boardType: post.boardType,
        authorId: post.authorId,
        authorNickname: post.author?.nickname ?? null,
        title: post.title,
        content: post.content,
        upvoteCount: post.upvoteCount,
        downvoteCount: post.downvoteCount,
        authorIp: viewer?.isAdmin ? post.authorIp : null,
        createdAt: post.createdAt.toISOString(),
      })),
      comments: comments.map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        postTitle: comment.post?.title ?? null,
        authorId: comment.authorId,
        authorNickname: comment.author?.nickname ?? null,
        content: comment.content,
        isAttendanceCheck: comment.isAttendanceCheck,
        createdAt: comment.createdAt.toISOString(),
      })),
      levels,
      counts: {
        users: users.length,
        posts: posts.length,
        comments: comments.length,
        attendance,
        levels: levels.length,
      },
    };
  } catch (err) {
    error = err instanceof Error ? err.message : "DB 오류";
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">1단계 스키마</h1>
        <p className="text-sm text-muted-foreground">테이블과 시드 데이터 확인용 화면입니다.</p>
      </header>
      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>데이터베이스 오류</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-xs text-muted-foreground">{error}</CardContent>
        </Card>
      ) : null}
      <SchemaDashboard data={data} />
    </div>
  );
}
