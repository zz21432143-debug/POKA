import { notFound } from "next/navigation";
import { replaceTo, replaceToLogin } from "@/lib/history-redirect";
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
  "store-review": "/community",
};

export default async function BoardWritePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (ALIASES[slug]) replaceTo(ALIASES[slug]);
  const board = resolveBoardSlug(slug);
  if (!board) notFound();
  if (slug === "free" || slug === "hand-review" || slug === "store-review") {
    notFound();
  }

  const viewer = await getCurrentUser();
  if (!viewer) replaceToLogin(`/boards/${slug}/write`);
  const allowed = canWriteBoard(viewer, board.boardType);
  const hint = WRITE_HINT[board.boardType] ?? board.title;

  return (
    <div className="flex flex-col gap-4">
      <header className="board-intro">
        <h1>{board.title} 작성</h1>
        <p className="mt-2">{hint}</p>
      </header>
      {!allowed ? (
        <p className="ink-panel rounded-xl px-4 py-6 text-sm text-[#D1D5DB]">
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
