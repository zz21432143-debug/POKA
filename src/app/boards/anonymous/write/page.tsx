import { BoardWriteForm } from "@/components/posts/board-write-form";

export default function AnonymousWritePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">익명 게시판 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          화면에는 익명으로 표시됩니다. 분쟁 대비를 위해 계정과 작성 IP는 서버에만 저장됩니다.
          매장 후기라면 4항목 별점도 남겨 주세요.
        </p>
      </header>
      <BoardWriteForm
        boardType="ANONYMOUS_REVIEW"
        hint="닉네임은 공개되지 않습니다. 별점은 선택입니다"
      />
    </div>
  );
}
