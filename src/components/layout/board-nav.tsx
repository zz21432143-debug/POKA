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
      <div className="px-3 pt-3">
        <a
          href="/"
          onClick={onNavigate}
          className={cn(
            "touch-target flex min-h-11 items-center gap-2.5 rounded-full px-4 text-sm font-semibold",
            homeActive
              ? "home-tab-3d text-white"
              : "bg-[#143d28] text-emerald-50 hover:bg-[#0d3b24]",
          )}
        >
          <HomeIcon className="size-4 shrink-0" />
          <span className="flex-1">홈</span>
          <ChevronRightIcon className="size-4 opacity-80" />
        </a>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {groups.map((group, index) => (
          <div key={group.title ?? `g-${index}`}>
            {group.title ? (
              <p className="mb-2 px-2 text-[11px] font-bold tracking-wide text-[#a6843d]">
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
                          ? "home-tab-3d font-semibold text-white"
                          : "font-medium text-[#6d5834] hover:bg-[#efe4cc]",
                      )}
                      onClick={onNavigate}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-[#f3e2a4]" : "text-[#D4AF37]")} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-3 rounded-[1.25rem] bg-[#0d3b24] px-4 py-5 text-center shadow-[inset_0_1px_0_rgb(255_255_255_/_0.12),0_4px_0_#062214]">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#145232] text-[#D4AF37] shadow-[inset_0_2px_0_rgb(255_255_255_/_0.15)]">
          <SpadeIcon className="size-5" />
        </span>
        <p
          className="mt-2 text-[16px] leading-6 text-[#D4AF37]"
          style={{ fontFamily: "var(--font-script), cursive" }}
        >
          포카와 함께하는
          <br />
          즐거운 시간들! ✌️
        </p>
      </div>
    </nav>
  );
}
