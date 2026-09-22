import { cn } from "cn";

export function AdSlot({
  placement,
  className,
}: {
  placement: "sidebar" | "infeed";
  className?: string;
}) {
  const sidebar = placement === "sidebar";
  return (
    <aside
      data-ad-placement={placement}
      data-ad-client="ca-pub-pending"
      aria-label="광고 영역"
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-border/80 bg-muted/30 text-center text-muted-foreground",
        sidebar
          ? "min-h-[140px] flex-1 rounded-xl px-3 py-4"
          : "min-h-20 rounded-none px-3 py-4",
        className,
      )}
    >
      <p className="text-[11px] font-medium tracking-wide uppercase">AdSense</p>
      <p className="mt-1 text-sm">{sidebar ? "사이드바 광고 구좌" : "리스트형 인피드 광고"}</p>
      <p className="mt-2 max-w-[14rem] text-[11px] leading-4">
        게시자 ID 연동 후 여기에 광고가 로드됩니다.
      </p>
    </aside>
  );
}
