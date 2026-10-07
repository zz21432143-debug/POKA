import Link from "next/link";
import { InfinitePostList } from "@/components/posts/infinite-post-list";
import { buttonVariants } from "@/components/ui/button";
import { LiabilityNotice } from "@/components/legal/liability-notice";
import { BOARD_DESCRIPTIONS } from "@/lib/boards";
import { getCurrentUser } from "@/lib/current-user";
import { loadFeedPage } from "@/lib/load-feed";
import { canWriteBoard } from "@/lib/permissions";
import { POST_EXP } from "@/lib/rewards";
import { PAGE_SIZE } from "@/lib/feed";
import { cn } from "cn";
import { getSponsorCreative } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function AnonymousBoardPage() {
  const viewer = await getCurrentUser().catch(() => null);
  const canWrite = canWriteBoard(viewer, "ANONYMOUS_REVIEW");
  const page = await loadFeedPage("anonymous", 0, PAGE_SIZE);
  const nativeSponsor = await getSponsorCreative("NATIVE").catch(() => null);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">익명 게시판</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {BOARD_DESCRIPTIONS.ANONYMOUS_REVIEW} · 작성 EXP {POST_EXP.ANONYMOUS_REVIEW}
            {page.total ? ` · ${page.total}개` : ""}
            {" · 목록은 누구나, 본문은 로그인 후"}
          </p>
        </div>
        {canWrite ? (
          <Link href="/boards/anonymous/write" className={cn(buttonVariants({ size: "touch" }), "inline-flex")}>
            글쓰기
          </Link>
        ) : (
          <Link href="/login?next=/boards/anonymous/write" className={cn(buttonVariants({ size: "touch" }), "inline-flex")}>
            로그인 후 글쓰기
          </Link>
        )}
      </header>
      <LiabilityNotice />
      <InfinitePostList
        feedKey="anonymous"
        initialItems={page.posts}
        initialTotal={page.total}
        initialNextOffset={page.nextOffset}
        emptyText="아직 익명 글이 없습니다."
        nativeSponsor={nativeSponsor}
      />
    </div>
  );
}
