import { PostList } from "@/components/posts/post-list";
import { prisma } from "@/lib/db";
import { JOB_KINDS } from "@/lib/nav";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JobBoardPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const job = JOB_KINDS[kind as keyof typeof JOB_KINDS];
  if (!job) notFound();

  let posts: {
    id: string;
    boardType: string;
    title: string;
    authorNickname: string | null;
    upvoteCount: number;
    createdAt: string;
  }[] = [];
  try {
    const rows = await prisma.post.findMany({
      where: { boardType: "JOBS" },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { nickname: true } } },
    });
    posts = rows.map((post) => ({
      id: post.id,
      boardType: post.boardType,
      title: post.title,
      authorNickname: post.author?.nickname ?? null,
      upvoteCount: post.upvoteCount,
      createdAt: post.createdAt.toISOString(),
    }));
  } catch {
    posts = [];
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.blurb}. 구인 3종 세부는 레이아웃 단계에서 메뉴로 분리했습니다.
        </p>
      </header>
      <PostList posts={posts} emptyText="등록된 구인 글이 없습니다." />
    </div>
  );
}
