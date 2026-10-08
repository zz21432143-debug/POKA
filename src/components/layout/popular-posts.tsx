import Link from "next/link";
import { getPopularPosts } from "@/lib/popular";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";
import { formatRelativeKst, toIsoString } from "@/lib/dates";
import { FlameIcon } from "lucide-react";

export async function PopularPosts() {
  try {
    const posts = await getPopularPosts(5).catch(() => []);
    return (
      <section className="lounge-card rounded-[1.5rem] p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <FlameIcon className="size-4 text-primary" />
          실시간 인기글
        </p>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">아직 집계된 글이 없습니다.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {posts.map((post, index) => (
              <li key={post.id}>
                <Link href={`/posts/${post.id}`} className="group flex gap-2">
                  <span className="w-4 shrink-0 text-sm font-bold text-primary">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold leading-snug group-hover:text-primary">
                      {post.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType}
                      {" · "}
                      {formatRelativeKst(toIsoString(post.createdAt))}
                      {" · 조회 "}
                      {post.viewCount}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  } catch {
    return (
      <section className="lounge-card rounded-[1.5rem] p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <FlameIcon className="size-4 text-primary" />
          실시간 인기글
        </p>
        <p className="mt-3 text-sm text-muted-foreground">아직 집계된 글이 없습니다.</p>
      </section>
    );
  }
}
