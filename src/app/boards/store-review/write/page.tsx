import { BoardWriteForm } from "@/components/posts/board-write-form";

export default function StoreReviewWritePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">매장후기 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          화면에는 익명으로 표시됩니다. 분쟁 대비를 위해 계정과 작성 IP는 서버에만 저장됩니다.
        </p>
      </header>
      <BoardWriteForm
        boardType="ANONYMOUS_REVIEW"
        hint="닉네임·마크는 공개되지 않습니다"
      />
    </div>
  );
}
