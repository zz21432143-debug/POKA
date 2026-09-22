import { BoardWriteForm } from "@/components/posts/board-write-form";

export default function PromoWritePage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">홍보 글 작성</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          배너 구좌 1~6을 지정하면 메인 프리미엄 6구좌에 연결됩니다. 비우면 일반 홍보글입니다.
        </p>
      </header>
      <BoardWriteForm boardType="PROMO" hint="일반 홍보 또는 프리미엄 배너" />
    </div>
  );
}
