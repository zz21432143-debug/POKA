import Link from "next/link";
import { prisma } from "@/lib/db";
import type { BoardType } from "@/generated/prisma/enums";
import { postIsThin } from "@/lib/seo-quality";
import { nowMs } from "@/lib/dates";

/**
 * 게시판 맨 위 「🔥 인기글」: 최근 60일 추천 · 조회가 많은 글 5개.
 * 짧은 글 · 욕설 글은 빼서, 처음 들어온 사람(과 검색엔진)이 좋은 글부터 보게 합니다.
 */
export async function PopularPosts({ boardTypes }: { boardTypes: BoardType[] }) {
  const rows = await prisma.post
    .findMany({
      where: {
        boardType: { in: boardTypes },
        hidden: false,
        isPrivate: false,
        isAttendanceThread: false,
        createdAt: { gte: new Date(nowMs() - 60 * 86_400_000) },
      },
      orderBy: [{ upvoteCount: "desc" }, { viewCount: "desc" }],
      take: 20,
      select: { id: true, title: true, content: true, boardType: true, viewCount: true, upvoteCount: true },
    })
    .catch(() => []);
  const posts = rows.filter((row) => !postIsThin(row)).slice(0, 5);
  if (posts.length < 2) return null;
  return (
    <section aria-label="인기글" data-popular-posts className="overflow-hidden rounded-[1.1rem] border border-[#c9a25c]/35 bg-[#1d1611]/70">
      <h2 className="px-4 pt-3 text-sm font-black text-[#f3d9a4]">🔥 인기글</h2>
      <ol className="divide-y divide-white/5">
        {posts.map((post, i) => (
          <li key={post.id}>
            <Link href={`/posts/${post.id}`} className="flex min-h-11 items-center gap-2 px-4 py-2 hover:bg-white/[0.04]">
              <span className="w-5 shrink-0 text-center text-sm font-black text-[#c9a25c] tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#f6efe2]">{post.title}</span>
              <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                👍 {post.upvoteCount} · 조회 {post.viewCount.toLocaleString("ko-KR")}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
