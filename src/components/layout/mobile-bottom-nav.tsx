"use client";

import { usePathname } from "next/navigation";
import {
  HomeIcon,
  LightbulbIcon,
  MessageCircleIcon,
  PenSquareIcon,
  UserRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { MOBILE_BOTTOM_NAV, mobileNavActive } from "@/lib/nav";

const ICONS = {
  home: HomeIcon,
  message: MessageCircleIcon,
  write: PenSquareIcon,
  lightbulb: LightbulbIcon,
  user: UserRoundIcon,
};

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="모바일 하단 메뉴"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-[1320px] grid-cols-5">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active = mobileNavActive(pathname, item);
          return (
            <li key={item.href}>
              <a
                href={item.href}
                className={cn(
                  "touch-target relative z-10 flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                <span className="break-keep">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
