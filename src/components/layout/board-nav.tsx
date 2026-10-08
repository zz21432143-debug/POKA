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
              ? "home-tab-3d text-[#fff8ee]"
              : "text-[#f4eadf] hover:bg-white/10",
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
              <p className="mb-2 px-2 text-[11px] font-bold tracking-wide text-[#e25a4a]">
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
                          ? "home-tab-3d font-semibold text-[#fff8ee]"
                          : "font-medium text-[#f4eadf] hover:bg-white/10",
                      )}
                      onClick={onNavigate}
                    >
                      <Icon className={cn("size-4 shrink-0", active ? "text-[#fff8ee]" : "text-[#e0b15a]")} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-3 flex items-center gap-2 rounded-2xl border border-[#5c2428] bg-[#2a1214] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/theme/yokai-cat.jpg" alt="" width={72} height={72} className="size-16 shrink-0 rounded-xl object-cover" />
        <p className="text-sm font-black leading-5 text-[#f6e7d4]">
          108요괴의 힘을
          <br />
          모아보세요!
        </p>
      </div>
    </nav>
  );
}
