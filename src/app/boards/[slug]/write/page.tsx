import { notFound, redirect } from "next/navigation";
import { ScheduleForm } from "@/components/listing/schedule-form";
import { OfficialPromoForm } from "@/components/promo/official-promo-form";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { getCurrentUser } from "@/lib/current-user";
import { WRITE_HINT, resolveBoardSlug } from "@/lib/nav";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const ALIASES: Record<string, string> = {
  hire: "/boards/jobs/fixed/write",
  pickup: "/boards/jobs/urgent/write",
  talent: "/boards/jobs/seek/write",
  events: "/boards/schedule/write",
  promo: "/boards/official/write",
  "store-review": "/boards/anonymous/write",
};

export default async function BoardWritePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (ALIASES[slug]) redirect(ALIASES[slug]);
  const board = resolveBoardSlug(slug);
  if (!board) notFound();
  if (slug === "free" || slug === "hand-review" || slug === "store-review" || slug === "anonymous") {
    notFound();
  }

  const viewer = await getCurrentUser();
  const allowed = canWriteBoard(viewer, board.boardType);
  const hint = WRITE_HINT[board.boardType] ?? board.title;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{board.title} 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </header>
      {!allowed ? (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          {writeDeniedMessage(board.boardType)}
        </p>
      ) : "calendar" in board && board.calendar ? (
        <ScheduleForm hint={hint} />
      ) : "gallery" in board && board.gallery ? (
        <OfficialPromoForm hint={hint} />
      ) : (
        <BoardWriteForm boardType={board.boardType} hint={hint} />
      )}
    </div>
  );
}
