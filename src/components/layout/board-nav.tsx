"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangleIcon,
  BellIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  CameraIcon,
  CheckCircle2Icon,
  HeartHandshakeIcon,
  HelpCircleIcon,
  HomeIcon,
  LightbulbIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  NewspaperIcon,
  ShieldIcon,
  SpadeIcon,
  UserRoundIcon,
} from "lucide-react";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive, type SidebarIcon } from "@/lib/nav";

const ICONS: Record<SidebarIcon, LucideIcon> = {
  home: HomeIcon,
  message: MessageCircleIcon,
  camera: CameraIcon,
  user: UserRoundIcon,
  briefcase: BriefcaseIcon,
  help: HelpCircleIcon,
  heart: HeartHandshakeIcon,
  alert: AlertTriangleIcon,
  book: BookOpenIcon,
  lightbulb: LightbulbIcon,
  newspaper: NewspaperIcon,
  calendar: CalendarDaysIcon,
  megaphone: MegaphoneIcon,
  bell: BellIcon,
  shield: ShieldIcon,
  check: CheckCircle2Icon,
  spade: SpadeIcon,
};

export function BoardNav({
  onNavigate,
  id,
}: {
  onNavigate?: () => void;
  id?: string;
}) {
  const pathname = usePathname();

  return (
    <nav id={id} aria-label="전체 게시판" className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-6">
        {SIDEBAR_NAV.map((group, index) => (
          <div key={group.title ?? `g-${index}`}>
            {group.title ? (
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground">
                {group.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : navItemActive(pathname, item.href);
                const Icon = ICONS[item.icon];
                const home = item.href === "/";
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "touch-target flex min-h-11 items-center gap-2.5 rounded-full px-3 text-sm transition-colors",
                        home && active
                          ? "bg-primary font-semibold text-white shadow-sm"
                          : active
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-foreground/80 hover:bg-muted",
                      )}
                    >
                      <Icon className="size-4 shrink-0 opacity-90" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 px-3 pb-2 text-xs leading-5 text-muted-foreground">
        좋은 사람들과
        <br />
        더 나은 내일을
      </p>
    </nav>
  );
}
