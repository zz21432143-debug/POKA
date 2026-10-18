"use client";

import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { ChevronRightIcon, StoreIcon } from "lucide-react";
import { SIDEBAR_NAV, navItemActive, navSectionOf } from "@/lib/nav";
import { useNavHint } from "@/lib/nav-hint";

/**
 * 위쪽 메뉴: 왼쪽 메뉴와 같은 묶음 · 순서(홈 · 구인구직 · 매장 관리 · 홀덤 공부 · 커뮤니티 · 포인트 · 놀이 · POKA).
 * 마우스를 올리면 아래로 메뉴판(세부 메뉴 + 설명)이 펼쳐집니다.
 */
export function TopNav() {
  const pathname = usePathname();
  const hint = useNavHint();
  const section = pathname === "/" ? null : navSectionOf(pathname, pathname.startsWith("/posts/") ? hint : null);
  const groups = SIDEBAR_NAV.filter((g) => g.title && g.hub);
  return (
    <nav aria-label="주요 메뉴" className="relative z-30 hidden shrink-0 items-center gap-0.5 lg:flex">
      <Link
        href="/"
        className={cn(
          "relative z-10 touch-target inline-flex min-h-11 items-center px-2.5 text-sm font-medium xl:px-3",
          pathname === "/" ? "text-[#F5EFE6]" : "text-[#F5EFE6]/70 hover:text-[#F5EFE6]",
        )}
      >
        홈
        {pathname === "/" ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#F5EFE6]" /> : null}
      </Link>
      {groups.map((group) => {
        const active = section === group.title;
        const store = group.title === "매장 관리";
        // 좁은 PC 화면에서는 POKA를 숨김(왼쪽 메뉴에 있음)
        const hideNarrow = group.title === "POKA";
        return (
          <div key={group.title} data-top-section={group.title} className={cn("group/top relative", hideNarrow && "hidden xl:block")}>
            {store ? (
              <Link
                href={group.hub!}
                data-nav-tools
                aria-current={active ? "page" : undefined}
                className={cn(
                  "touch-target relative z-10 mx-1 inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-black transition",
                  active ? "border-[#e7c98a] bg-[#c9a25c] text-[#1d1611]" : "border-[#c9a25c]/70 bg-[#c9a25c]/15 text-[#f3d9a4] hover:bg-[#c9a25c] hover:text-[#1d1611]",
                )}
              >
                <StoreIcon className="size-4" />
                {group.title}
              </Link>
            ) : (
              <Link
                href={group.hub!}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 touch-target inline-flex min-h-11 items-center px-2.5 text-sm font-medium whitespace-nowrap xl:px-3",
                  active ? "text-[#F5EFE6]" : "text-[#F5EFE6]/70 hover:text-[#F5EFE6]",
                )}
              >
                {group.title}
                {active ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#F5EFE6]" /> : null}
              </Link>
            )}
            {/* 메뉴판: 마우스를 올리거나 키보드로 들어오면 아래로 펼침(마우스가 있는 PC만) */}
            <div
              data-top-flyout={group.title}
              className="invisible absolute top-full left-0 z-50 pt-2 opacity-0 transition-opacity duration-150 group-hover/top:visible group-hover/top:opacity-100 group-focus-within/top:visible group-focus-within/top:opacity-100"
            >
              <div className="max-h-[calc(100vh-90px)] w-72 overflow-y-auto rounded-2xl border border-[#c9a25c]/40 bg-[#1d1611] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                <Link href={group.hub!} className="mb-1 flex min-h-10 items-center justify-between rounded-lg px-3 text-sm font-black text-[#f3d9a4] hover:bg-[#2a2017]">
                  {group.title} 전체 보기
                  <ChevronRightIcon className="size-4" />
                </Link>
                <ul className="grid gap-0.5">
                  {group.items.map((item) => {
                    const on = navItemActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn("grid min-h-12 content-center rounded-xl px-3 py-1.5", on ? "bg-[#7a1c22] text-[#f6efe2]" : "text-[#ece3d3] hover:bg-[#2a2017]")}
                        >
                          <span className="flex items-center gap-1.5 text-[15px] font-bold">
                            {item.label}
                            {item.badge ? <span className={item.badge === "HOT" ? "nav-new-badge nav-hot-badge" : "nav-new-badge"}>{item.badge === "HOT" ? "🔥 HOT" : item.badge}</span> : null}
                          </span>
                          <span className="truncate text-xs text-[#a89c88]">{item.hint}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
