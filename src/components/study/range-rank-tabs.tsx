import Link from "@/components/ui/link";
import { cn } from "cn";

/** 핸드 레인지 순위 ↔ 족보 순위(메뉴는 한 칸 · 페이지는 주소 그대로 둘) */
export function RangeRankTabs({ current }: { current: "ranges" | "rankings" }) {
  const tabs = [
    { key: "ranges", href: "/community/hand-ranges", label: "핸드 레인지 순위" },
    { key: "rankings", href: "/community/hand-rankings", label: "족보 순위" },
  ] as const;
  return (
    <nav aria-label="핸드 레인지 · 족보 순위" data-range-rank-tabs className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/40 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={cn(
            "grid min-h-11 place-items-center rounded-xl text-sm font-black",
            current === t.key ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#e7c98a] hover:bg-white/5",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
