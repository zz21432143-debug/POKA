"use client";

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
  ChevronRightIcon,
  HeartHandshakeIcon,
  HelpCircleIcon,
  HomeIcon,
  LightbulbIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  ShieldIcon,
  SpadeIcon,
  AwardIcon,
  EyeOffIcon,
} from "lucide-react";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive, type SidebarIcon } from "@/lib/nav";

const ICONS: Record<SidebarIcon, LucideIcon> = {
  home: HomeIcon,
  message: MessageCircleIcon,
  camera: CameraIcon,
  briefcase: BriefcaseIcon,
  help: HelpCircleIcon,
  heart: HeartHandshakeIcon,
  alert: AlertTriangleIcon,
  book: BookOpenIcon,
  lightbulb: LightbulbIcon,
  calendar: CalendarDaysIcon,
  megaphone: MegaphoneIcon,
  bell: BellIcon,
  shield: ShieldIcon,
  check: CheckCircle2Icon,
  spade: SpadeIcon,
  badge: AwardIcon,
  mask: EyeOffIcon,
};

export function BoardNav({
  onNavigate,
  id,
}: {
  onNavigate?: () => void;
  id?: string;
}) {
  const pathname = usePathname();
  const groups = SIDEBAR_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.href !== "/"),
  })).filter((group) => group.items.length > 0);
  const homeActive = pathname === "/";

  return (
    <nav id={id} aria-label="전체 게시판" className="flex h-full min-h-0 flex-col">
      <a
        href="/"
        onClick={onNavigate}
        className={cn(
          "touch-target flex min-h-12 items-center gap-2.5 px-4 text-sm font-semibold",
          homeActive ? "bg-[#0d3b24] text-white" : "bg-[#143d28] text-emerald-50 hover:bg-[#0d3b24]",
        )}
      >
        <HomeIcon className="size-4 shrink-0" />
        <span className="flex-1">홈</span>
        <ChevronRightIcon className="size-4 opacity-80" />
      </a>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => (
          <div key={group.title ?? `g-${index}`}>
            {group.title ? (
              <p className="mb-2 px-2 text-[11px] font-bold tracking-wide text-[#8a7f6c]">
                {group.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = navItemActive(pathname, item.href);
                const Icon = ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={cn(
                        "touch-target flex min-h-11 items-center gap-2.5 rounded-full px-3 text-sm transition-colors",
                        active
                          ? "bg-[#0d3b24] font-semibold text-white"
                          : "font-medium text-[#3f3a32] hover:bg-[#efe4cc]",
                      )}
                      onClick={onNavigate}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-emerald-200" : "text-[#b8860b]")} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-3 rounded-[1.25rem] bg-[#0d3b24] px-4 py-4 text-center text-emerald-50">
        <SpadeIcon className="mx-auto size-7 text-emerald-200" />
        <p
          className="mt-2 text-[15px] leading-6"
          style={{ fontFamily: "var(--font-script), cursive" }}
        >
          포커를 더 즐겁게
          <br />
          함께하는 공간
        </p>
      </div>
    </nav>
  );
}
