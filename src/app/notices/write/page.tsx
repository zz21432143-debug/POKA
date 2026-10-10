import type { Metadata } from "next";
import { BackToList } from "@/components/posts/back-to-list";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { getCurrentUser } from "@/lib/current-user";
import { replaceToLogin } from "@/lib/history-redirect";
import { canWriteBoard, writeDeniedMessage } from "@/lib/permissions";

export const metadata: Metadata = { title: "공지 작성", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function NoticeWritePage() {
  const viewer = await getCurrentUser();
  if (!viewer) replaceToLogin("/notices/write");
  const allowed = canWriteBoard(viewer, "NOTICE");

  return (
    <div className="flex flex-col gap-4">
      <BackToList href="/notices" className="self-start" />
      <header className="board-intro">
        <h1>공지사항 작성</h1>
        <p className="mt-2">마스터 계정만 올릴 수 있습니다.</p>
      </header>
      {!allowed ? (
        <p className="ink-panel rounded-xl px-4 py-6 text-sm text-[#D1D5DB]">
          {writeDeniedMessage("NOTICE")}
        </p>
      ) : (
        <BoardWriteForm boardType="NOTICE" hint="운영 공지. 사실과 일정만 간단히 적으세요." />
      )}
    </div>
  );
}
