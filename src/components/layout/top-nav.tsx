"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { ChevronDownIcon, ChevronRightIcon, StoreIcon } from "lucide-react";
import { BOXED_ITEM, SIDEBAR_NAV, navItemActive, navSectionOf } from "@/lib/nav";
import { useNavHint } from "@/lib/nav-hint";

/**
 * 위쪽 메뉴(PC · 사이트 메뉴는 여기 하나): 홈 · 출석 · 묶음 7개.
 * 묶음에 마우스를 올리거나 키보드로 들어오면 메뉴 바로 아래에 「모든 묶음의 세부 메뉴」 판이 펼쳐짐(올린 묶음은 금색).
 * 묶음 이름을 누르면 그 묶음 모음 화면으로 감. 판은 마우스가 떠나거나 Esc · 바깥을 누르면 닫힘.
 */
export function TopNav() {
  const pathname = usePathname();
  const hint = useNavHint();
  const section = pathname === "/" ? null : navSectionOf(pathname, pathname.startsWith("/posts/") ? hint : null);
  const groups = SIDEBAR_NAV.filter((g) => g.title && g.hub);
  const [open, setOpen] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const keep = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };
  const closeSoon = () => {
    keep();
    closeTimer.current = window.setTimeout(() => setOpen(null), 180);
  };
  // 페이지를 옮기면 닫기 · Esc로 닫기
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소가 바뀌면 펼친 판을 닫음
    setOpen(null);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const plain = (href: string, label: string, on: boolean, extra?: Record<string, string>) => (
    <Link
      href={href}
      {...extra}
      className={cn(
        "relative z-10 touch-target inline-flex min-h-11 items-center px-2.5 text-sm font-medium whitespace-nowrap xl:px-3",
        on ? "text-[#F5EFE6]" : "text-[#F5EFE6]/70 hover:text-[#F5EFE6]",
      )}
    >
      {label}
      {on ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#F5EFE6]" /> : null}
    </Link>
  );

  return (
    <nav aria-label="주요 메뉴" className="relative z-30 hidden shrink-0 items-center gap-0.5 lg:flex" onMouseLeave={closeSoon} onMouseEnter={keep}>
      {plain("/", "홈", pathname === "/")}
      {plain("/attendance", "출석", pathname.startsWith("/attendance"), { "data-top-attendance": "" })}
      {groups.map((group) => {
        const active = section === group.title;
        const store = group.title === "매장 관리";
        const hovered = open === group.title;
        return (
          <div
            key={group.title}
            data-top-section={group.title}
            className={cn("relative", group.title === "POKA" && "hidden xl:block")}
            onMouseEnter={() => {
              keep();
              setOpen(group.title);
            }}
            onFocus={() => setOpen(group.title)}
          >
            <Link
              href={group.hub!}
              data-nav-tools={store ? "" : undefined}
              aria-current={active ? "page" : undefined}
              aria-expanded={hovered}
              className={cn(
                store
                  ? "touch-target relative z-10 mx-1 inline-flex min-h-10 items-center gap-1 rounded-full border px-3.5 text-sm font-black transition"
                  : "relative z-10 touch-target inline-flex min-h-11 items-center gap-0.5 px-2.5 text-sm font-medium whitespace-nowrap xl:px-3",
                store
                  ? active || hovered
                    ? "border-[#e7c98a] bg-[#c9a25c] text-[#1d1611]"
                    : "border-[#c9a25c]/70 bg-[#c9a25c]/15 text-[#f3d9a4]"
                  : active || hovered
                    ? "text-[#F5EFE6]"
                    : "text-[#F5EFE6]/70",
              )}
            >
              {store ? <StoreIcon className="size-4" /> : null}
              {group.title}
              <ChevronDownIcon className={cn("size-3.5 opacity-60 transition-transform", hovered && "rotate-180")} />
              {active && !store ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#F5EFE6]" /> : null}
            </Link>
          </div>
        );
      })}

      {/* 메뉴판: 모든 묶음의 세부 메뉴를 칸별로(올린 묶음 금색) */}
      {open ? (
        <div data-mega-menu className="fixed inset-x-0 top-[4.5rem] z-50 px-4 pt-1" onMouseEnter={keep} onMouseLeave={closeSoon}>
          <div className="mx-auto max-w-[1560px] rounded-2xl border border-[#c9a25c]/40 bg-[#1a1411] p-4 shadow-[0_24px_48px_rgba(0,0,0,0.6)]">
            <div className="grid max-h-[calc(100vh-7rem)] grid-cols-6 gap-3 overflow-y-auto">
              {groups.map((group) => {
                const hovered = open === group.title;
                return (
                  <section
                    key={group.title}
                    data-mega-col={group.title}
                    onMouseEnter={() => setOpen(group.title)}
                    className={cn("min-w-0 rounded-xl p-2 transition-colors", hovered ? "bg-[#c9a25c]/12 ring-1 ring-[#c9a25c]/50" : "")}
                  >
                    <Link href={group.hub!} className={cn("mb-1 flex min-h-10 items-center justify-between rounded-lg px-2 text-[15px] font-black hover:bg-[#2a2017]", hovered ? "text-[#f3d9a4]" : "text-[#ece3d3]")}>
                      {group.title}
                      <ChevronRightIcon className="size-4 opacity-70" />
                    </Link>
                    <ul className="grid gap-0.5">
                      {group.items.map((item) => {
                        const on = navItemActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn("grid min-h-11 content-center rounded-lg px-2 py-1", on ? "bg-[#7a1c22] text-[#f6efe2]" : item.boxed ? BOXED_ITEM : "text-[#ece3d3] hover:bg-[#2a2017]")}
                            >
                              <span className="flex items-center gap-1.5 text-sm font-bold">
                                <span className="truncate">{item.label}</span>
                                {item.badge ? <span className={item.badge === "HOT" ? "nav-new-badge nav-hot-badge" : "nav-new-badge"}>{item.badge === "HOT" ? "🔥 HOT" : item.badge}</span> : null}
                              </span>
                              <span className="truncate text-[11px] text-[#a89c88]">{item.hint}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
