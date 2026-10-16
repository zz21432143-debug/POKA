import type { ReactNode } from "react";
import { cn } from "cn";

/** 글쓰기 「등록」 버튼 칸: 휴대폰은 화면 아래에 붙어 있음(글을 쓰다 바로 누르게) · PC는 제자리 */
export function StickySubmit({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-write-submit
      className={cn(
        "sticky bottom-0 z-30 grid gap-1 rounded-t-2xl border-t border-[#c9a25c]/30 bg-[#120d0a]/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:block sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 [&>button]:w-full sm:[&>button]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
