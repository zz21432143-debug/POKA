import { notFound } from "next/navigation";
import { HireForm } from "@/components/listing/hire-form";
import { BoardListingForm } from "@/components/listing/board-listing-form";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { getCurrentUser } from "@/lib/current-user";
import { WRITE_HINT, resolveBoardSlug } from "@/lib/nav";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function BoardWritePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = resolveBoardSlug(slug);
  if (!board) notFound();
  if (slug === "free" || slug === "hand-review" || slug === "store-review" || slug === "promo") {
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
      ) : "listing" in board && board.listing === "hire" ? (
        <HireForm hint={hint} />
      ) : "listing" in board && board.listing === "talent" ? (
        <BoardListingForm boardType="TALENT" hint={hint} mode="talent" />
      ) : "listing" in board && board.listing === "pickup" ? (
        <BoardListingForm boardType="PICKUP" hint={hint} mode="pickup" />
      ) : "gallery" in board && board.gallery ? (
        <BoardListingForm boardType={board.boardType} hint={hint} mode="poster" />
      ) : "calendar" in board && board.calendar ? (
        <BoardListingForm boardType="SCHEDULE" hint={hint} mode="schedule" />
      ) : (
        <BoardWriteForm boardType={board.boardType} hint={hint} />
      )}
    </div>
  );
}
