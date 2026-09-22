import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-muted-foreground">메뉴에서 게시판을 다시 선택해 주세요.</p>
      <Link
        href="/"
        className="touch-target mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        메인으로
      </Link>
    </div>
  );
}
