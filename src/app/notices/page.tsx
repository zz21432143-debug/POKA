import Link from "next/link";
import { InfinitePostList } from "@/components/posts/infinite-post-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/current-user";
import { loadFeedPage } from "@/lib/load-feed";
import { canWriteBoard } from "@/lib/permissions";
import { PAGE_SIZE } from "@/lib/feed";
import { cn } from "cn";
import { OFFICIAL_NOTICES } from "@/lib/notices";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  const viewer = await getCurrentUser().catch(() => null);
  const canWrite = canWriteBoard(viewer, "NOTICE");
  const page = await loadFeedPage("notices", 0, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>공지사항</h1>
          <p className="mt-2">
            운영 공지입니다. 작성은 마스터 계정만 가능합니다.
          </p>
        </div>
        {canWrite ? (
          <Link href="/notices/write" className={cn(buttonVariants({ size: "touch" }), "inline-flex")}>
            공지 작성
          </Link>
        ) : null}
      </header>
      {page.total === 0 ? (
        <ul className="ink-panel divide-y divide-[#3a332c] overflow-hidden rounded-2xl">
          {OFFICIAL_NOTICES.map((item) => {
            const external = item.href.startsWith("http");
            const className =
              "touch-target flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-white hover:bg-[#241c1e] hover:text-white";
            const body = (
              <>
                <span className="min-w-0 truncate text-sm font-bold text-white">{item.title}</span>
                <span className="shrink-0 text-xs text-[#9CA3AF]">{item.date}</span>
              </>
            );
            return (
              <li key={item.id}>
                {external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {body}
                  </a>
                ) : (
                  <Link href={item.href} className={className}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <InfinitePostList
          feedKey="notices"
          initialItems={page.posts}
          initialTotal={page.total}
          initialNextOffset={page.nextOffset}
          emptyText="등록된 공지가 없습니다."
        />
      )}
    </div>
  );
}
