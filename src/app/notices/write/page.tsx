import { redirect } from "next/navigation";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { getCurrentUser } from "@/lib/current-user";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NoticeWritePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login?next=/notices/write");
  const allowed = canWriteBoard(viewer, "NOTICE");

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">공지사항 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">마스터 계정만 올릴 수 있습니다.</p>
      </header>
      {!allowed ? (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          {writeDeniedMessage("NOTICE")}
        </p>
      ) : (
        <BoardWriteForm boardType="NOTICE" hint="운영 공지. 사실과 일정만 간단히 적으세요." />
      )}
    </div>
  );
}
