"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { TOP_NAV } from "@/lib/nav";

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="relative z-20 hidden shrink-0 items-center gap-0.5 lg:flex">
      {TOP_NAV.map((item) => {
        // 딜러 연습장은 주소가 /tools/… 이지만 메뉴는 커뮤니티에 있습니다
        const path = pathname.startsWith("/tools/practice") ? "/community" : pathname;
        const active = item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
        const className = cn(
          "relative z-10 touch-target inline-flex min-h-11 items-center px-3 text-sm font-medium",
          active ? "text-[#F5EFE6]" : "text-[#F5EFE6]/70 hover:text-[#F5EFE6]",
        );
        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.label}
            {active ? <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#F5EFE6]" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
