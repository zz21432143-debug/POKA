"use client";

import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive, navSectionOf } from "@/lib/nav";
import { useNavHint } from "@/lib/nav-hint";

/**
 * PC: 지금 들어간 묶음의 세부 메뉴를 내용 맨 위 한 줄 탭으로(왼쪽 메뉴 대신 · 휴대폰은 ☰ 메뉴가 있어서 숨김).
 * 홈 · 묶음 밖 페이지는 안 보임.
 */
export function SectionTabs() {
  const pathname = usePathname() ?? "";
  const hint = useNavHint();
  if (pathname === "/") return null;
  const title = navSectionOf(pathname, pathname.startsWith("/posts/") ? hint : null);
  const group = SIDEBAR_NAV.find((g) => g.title === title && g.hub);
  if (!group) return null;
  // 가장 잘 맞는 칸 하나만 켬(예: /boards/jobs/urgent는 「급구」만, 「구인구직 전체」는 끔)
  const hits = group.items.filter((item) => navItemActive(pathname, item.href));
  const current = hits.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  const onHub = pathname === group.hub;
  return (
    <nav aria-label={`${group.title} 메뉴`} data-section-tabs={group.title} className="mb-3 hidden flex-wrap items-center gap-1 border-b border-white/10 pb-2 lg:flex">
      <Link
        href={group.hub!}
        className={cn(
          "inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-black",
          onHub ? "bg-[#c9a25c] text-[#1d1611]" : "text-[#f3d9a4] hover:bg-white/5",
        )}
      >
        {group.title}
      </Link>
      <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-white/15" />
      {group.items.map((item) => {
        const on = !onHub && item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold whitespace-nowrap",
              on ? "bg-[#7a1c22] text-[#f6efe2]" : "text-[#d9cfbd] hover:bg-white/5 hover:text-[#f3d9a4]",
            )}
          >
            {item.label}
            {item.badge ? <span className={item.badge === "HOT" ? "nav-new-badge nav-hot-badge" : "nav-new-badge"}>{item.badge === "HOT" ? "🔥" : item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
