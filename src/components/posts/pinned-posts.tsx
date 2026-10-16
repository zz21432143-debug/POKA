import Link from "@/components/ui/link";
import { prisma } from "@/lib/db";
import type { BoardType } from "@/generated/prisma/enums";

/** 게시판 맨 위 「📌 중요」 글(관리자가 고정 · 게시판마다 최대 3개) */
export async function PinnedPosts({ boardTypes }: { boardTypes: BoardType[] }) {
  const posts = await prisma.post
    .findMany({
      where: { boardType: { in: boardTypes }, pinnedAt: { not: null }, hidden: false },
      orderBy: { pinnedAt: "desc" },
      take: 6,
      select: { id: true, title: true, createdAt: true },
    })
    .catch(() => []);
  if (!posts.length) return null;
  return (
    <section aria-label="중요 글" data-pinned-posts className="overflow-hidden rounded-[1.1rem] border border-[#e5484d]/35 bg-[#2a1214]/60">
      <ul className="divide-y divide-[#e5484d]/15">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={`/posts/${post.id}`} className="flex min-h-12 items-center gap-2 px-4 py-2 hover:bg-white/[0.04]">
              <span className="shrink-0 rounded-full bg-[#e5484d] px-2 py-0.5 text-[11px] font-black text-white">📌 중요</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#f6efe2]">{post.title}</span>
              <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(post.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
