import Link from "next/link";
import { getPopularPosts } from "@/lib/popular";
import { BOARD_LABELS, type BoardTypeKey } from "@/lib/boards";

export async function PopularPosts() {
  const posts = await getPopularPosts(5);
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium tracking-wide text-primary uppercase">실시간 인기글</p>
      {posts.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">아직 집계된 글이 없습니다.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1">
          {posts.map((post, index) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}`}
                className="touch-target flex min-h-11 items-start gap-2 rounded-lg px-1 py-1 hover:bg-muted"
              >
                <span className="w-4 shrink-0 text-sm font-semibold text-primary">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{post.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {BOARD_LABELS[post.boardType as BoardTypeKey] ?? post.boardType} · 추천{" "}
                    {post.upvoteCount} · 조회 {post.viewCount}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
