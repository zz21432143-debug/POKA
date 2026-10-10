import type { Metadata } from "next";
import { BackToList } from "@/components/posts/back-to-list";
import { RequireLogin } from "@/components/auth/require-login";
import { BoardWriteForm } from "@/components/posts/board-write-form";

export const metadata: Metadata = { title: "자유게시판 글쓰기", robots: { index: false } };

export default function FreeWritePage() {
  return (
    <RequireLogin>
      <div className="flex flex-col gap-4">
        <BackToList href="/boards/free" className="self-start" />
        <header className="board-intro">
          <h1>자유게시판 작성</h1>
        </header>
        <BoardWriteForm boardType="FREE" hint="자유 수다, 잡담, 현장 이야기" />
      </div>
    </RequireLogin>
  );
}
