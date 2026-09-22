import { SchemaDashboard } from "@/components/schema-dashboard";
import { prisma } from "@/lib/db";
import type { SchemaSnapshot } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const EMPTY: SchemaSnapshot = {
  users: [],
  posts: [],
  comments: [],
  levels: [],
  counts: { users: 0, posts: 0, comments: 0, attendance: 0, levels: 0 },
};

async function loadSnapshot(): Promise<{ data: SchemaSnapshot; error: string | null }> {
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

    return {
      error: null,
      data: {
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
          authorIp: post.authorIp,
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
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "데이터베이스에 연결할 수 없습니다.";
    return { data: EMPTY, error: message };
  }
}

export default async function Home() {
  const { data, error } = await loadSnapshot();

  return (
    <div className="felt-bg min-h-screen">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
              Phase 1 · Schema
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              펠트클럽
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              포커 플레이어와 딜러를 위한 커뮤니티의 1단계입니다. 회원, 게시판,
              댓글/출석, 레벨·마크 포인트 테이블을 심고 시드 데이터로 확인합니다.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            PC · Android · iOS 반응형 웹
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>데이터베이스가 아직 준비되지 않았습니다</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                프로젝트 루트에서{" "}
                <code className="text-primary">npx prisma migrate dev</code> 후{" "}
                <code className="text-primary">npx prisma db seed</code> 를
                실행하세요.
              </p>
              <p className="font-mono text-xs">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {data.counts.users === 0 && !error ? (
          <Card>
            <CardHeader>
              <CardTitle>테이블은 있지만 시드 데이터가 없습니다</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <code className="text-primary">npx prisma db seed</code> 로 샘플
              회원·게시글·레벨 표를 채울 수 있습니다.
            </CardContent>
          </Card>
        ) : null}

        <SchemaDashboard data={data} />
      </main>
    </div>
  );
}
