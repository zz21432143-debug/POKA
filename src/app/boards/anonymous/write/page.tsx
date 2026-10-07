import { RequireLogin } from "@/components/auth/require-login";
import { BoardWriteForm } from "@/components/posts/board-write-form";
import { LiabilityNotice } from "@/components/legal/liability-notice";

export default function AnonymousWritePage() {
  return (
    <RequireLogin>
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold">익명 게시판 작성</h1>
          <p className="mt-1 text-sm text-muted-foreground">화면에 닉네임은 보이지 않습니다.</p>
        </header>
        <LiabilityNotice />
        <BoardWriteForm
          boardType="ANONYMOUS_REVIEW"
          hint="닉네임은 화면에 보이지 않습니다. 작성 책임은 본인에게 있습니다."
        />
      </div>
    </RequireLogin>
  );
}
