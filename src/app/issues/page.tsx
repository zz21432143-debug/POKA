import Link from "next/link";
import { InfinitePostList } from "@/components/posts/infinite-post-list";
import { loadFeedPage } from "@/lib/load-feed";
import { PAGE_SIZE } from "@/lib/feed";
import { getSponsorCreative } from "@/lib/inventory";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  const page = await loadFeedPage("free", 0, PAGE_SIZE);
  const nativeSponsor = await getSponsorCreative("NATIVE").catch(() => null);
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">사고 · 사건 · 이슈</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            현장에서 벌어진 이슈와 공유할 사건을 모았습니다. 글은 자유게시판과 같은 곳에 올라갑니다.
            목록은 누구나, 본문은 로그인 후.{page.total ? ` · ${page.total}개` : ""}
          </p>
        </div>
        <Link href="/boards/free/write" className={cn(buttonVariants({ size: "touch" }), "inline-flex")}>
          글쓰기
        </Link>
      </header>
      <InfinitePostList
        feedKey="free"
        initialItems={page.posts}
        initialTotal={page.total}
        initialNextOffset={page.nextOffset}
        emptyText="등록된 이슈가 없습니다."
        showBoard
        nativeSponsor={nativeSponsor}
      />
    </div>
  );
}
