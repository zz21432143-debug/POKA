"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive } from "@/lib/nav";
import { BrandIcon } from "@/components/brand/brand-icon";


export function BoardNav({
  onNavigate,
  id,
  inDrawer = false,
}: {
  onNavigate?: () => void;
  id?: string;
  inDrawer?: boolean;
}) {
  const pathname = usePathname();
  const groups = SIDEBAR_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.href !== "/"),
  })).filter((group) => group.items.length > 0);
  const homeActive = pathname === "/";

  return (
    <nav id={id} aria-label="전체 게시판" className="flex flex-col">
      <div className={inDrawer ? "pt-1" : "px-3 pt-3"}>
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "touch-target flex min-h-12 items-center gap-2.5 rounded-xl border-0 px-3 text-base font-semibold shadow-none",
            homeActive
              ? "bg-[#7a1c22] text-[#f6efe2]"
              : "text-[#ece3d3] hover:bg-[#2a2017] hover:text-[#e7c98a]",
          )}
        >
          <BrandIcon name="torii" active={homeActive} />
          <span className="flex-1">홈</span>
          <ChevronRightIcon className="size-4 opacity-80" />
        </Link>
      </div>
      <div
        className={
          inDrawer ? "flex flex-col gap-4 py-3" : "flex flex-col gap-3 px-3 py-3"
        }
      >
        {groups.map((group, index) => {
          const items = (
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active =
                  navItemActive(pathname, item.href) &&
                  !group.items.some(
                    (other) =>
                      other.href !== item.href &&
                      other.href.startsWith(`${item.href}/`) &&
                      navItemActive(pathname, other.href),
                  );
                return (
                  <li key={item.href} className="border-0">
                    <a
                      href={item.href}
                      className={cn(
                        "touch-target flex items-center gap-2.5 rounded-xl border-0 px-3 shadow-none transition-colors",
                        inDrawer ? "min-h-12 text-base" : "min-h-10 text-[15px]",
                        active
                          ? "bg-[#7a1c22] font-semibold text-[#f6efe2]"
                          : "bg-transparent font-semibold text-[#ece3d3] hover:bg-[#2a2017] hover:text-[#e7c98a]",
                      )}
                      onClick={onNavigate}
                    >
                      <BrandIcon name={item.icon} active={active} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          );
          const heading = "rounded-lg bg-[#2a2017] px-3 py-1.5 text-sm font-bold text-[#e7c98a]";
          if (group.collapsible && group.title) {
            // 처음 들어오면 펼친 상태. 필요하면 제목을 눌러 접을 수 있습니다.
            return (
              <details key={group.title} className="group/nav" open>
                <summary
                  className={cn(
                    heading,
                    "touch-target flex min-h-11 cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden",
                  )}
                >
                  {group.title}
                  <ChevronDownIcon className="size-4 transition-transform group-open/nav:rotate-180" />
                </summary>
                <div className="mt-2">{items}</div>
              </details>
            );
          }
          return (
            <div key={group.title ?? `g-${index}`}>
              {group.title ? <p className={cn(heading, "mb-2")}>{group.title}</p> : null}
              {items}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
