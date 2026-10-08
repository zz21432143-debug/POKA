import { RequireLogin } from "@/components/auth/require-login";
import { BoardWriteForm } from "@/components/posts/board-write-form";

export default function FreeWritePage() {
  return (
    <RequireLogin>
      <div className="flex flex-col gap-4">
        <header className="board-intro">
          <h1>자유게시판 작성</h1>
        </header>
        <BoardWriteForm boardType="FREE" hint="자유 수다, 잡담, 현장 이야기" />
      </div>
    </RequireLogin>
  );
}
