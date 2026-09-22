"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { BOARD_NAV, navGroupActive, navItemActive } from "@/lib/nav";

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <nav aria-label="대메뉴" className="hidden min-w-0 flex-1 items-stretch justify-center md:flex">
      <ul className="flex max-w-full items-stretch gap-0.5 overflow-x-auto">
        {BOARD_NAV.map((group) => {
          const active = navGroupActive(pathname, group);
          const hasMenu = group.items.length > 0;
          const expanded = open === group.title;
          return (
            <li
              key={group.title}
              className="relative"
              onMouseEnter={() => hasMenu && setOpen(group.title)}
              onMouseLeave={() => setOpen(null)}
            >
              {hasMenu ? (
                <>
                  <button
                    type="button"
                    className={cn(
                      "touch-target inline-flex min-h-11 items-center gap-1 rounded-lg px-2.5 text-sm whitespace-nowrap lg:px-3",
                      active ? "font-semibold text-primary" : "text-foreground hover:bg-muted",
                    )}
                    aria-expanded={expanded}
                    aria-haspopup="true"
                    onClick={() => setOpen(expanded ? null : group.title)}
                  >
                    {group.title}
                    <ChevronDownIcon className="size-3.5 opacity-70" />
                  </button>
                  {expanded ? (
                    <ul className="absolute top-full left-0 z-50 min-w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "touch-target flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm",
                              navItemActive(pathname, item.href)
                                ? "bg-primary/15 font-medium text-primary"
                                : "hover:bg-muted",
                            )}
                            onClick={() => setOpen(null)}
                          >
                            <span>{item.label}</span>
                            <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <Link
                  href={group.href}
                  className={cn(
                    "touch-target inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm whitespace-nowrap lg:px-3",
                    active ? "font-semibold text-primary" : "text-foreground hover:bg-muted",
                  )}
                >
                  {group.title}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
