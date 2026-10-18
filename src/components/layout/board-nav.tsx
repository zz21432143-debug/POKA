"use client";

import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive, sidebarGroupActive } from "@/lib/nav";
import { BrandIcon } from "@/components/brand/brand-icon";
import {
  AwardIcon,
  BarChart3Icon,
  BellIcon,
  BookOpenIcon,
  BriefcaseIcon,
  Building2Icon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CalculatorIcon,
  GraduationCapIcon,
  Grid3x3Icon,
  HandshakeIcon,
  HomeIcon,
  LightbulbIcon,
  ListOrderedIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  MonitorPlayIcon,
  PercentIcon,
  PieChartIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  ShuffleIcon,
  SpadeIcon,
  TargetIcon,
  TrophyIcon,
  UsersIcon,
  TimerIcon,
  WalletIcon,
  ZapIcon,
  StoreIcon,
  Gamepad2Icon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react";

/** 메뉴 아이콘: 한 가지 굵기 · 한 가지 색의 선 아이콘(칸마다 뜻에 맞게) */
const NAV_ICON: Record<string, LucideIcon> = {
  "/": HomeIcon,
  "/boards/jobs/apply": BriefcaseIcon,
  "/boards/jobs/tournament": TrophyIcon,
  "/boards/jobs/urgent": ZapIcon,
  "/boards/jobs/fixed": Building2Icon,
  "/boards/jobs/team": UsersIcon,
  "/boards/free": MessagesSquareIcon,
  "/boards/hand-review": SpadeIcon,
  "/tools/practice": TargetIcon,
  "/community/equity": PercentIcon,
  "/community/hand-rankings": ListOrderedIcon,
  "/community/hand-ranges": BarChart3Icon,
  "/attendance": CalendarCheckIcon,
  "/boards/schedule": CalendarDaysIcon,
  "/boards/tda": BookOpenIcon,
  "/info/guide": GraduationCapIcon,
  "/info/holdem": BookOpenIcon,
  "/info/icm": PieChartIcon,
  "/info/push-fold": Grid3x3Icon,
  "/tools/board": MonitorPlayIcon,
  "/tools/rotation": RefreshCwIcon,
  "/tools/seat-draw": ShuffleIcon,
  "/tools/pay": WalletIcon,
  "/tools/shot-clock": TimerIcon,
  "/notices": BellIcon,
  "/boards/official": MegaphoneIcon,
  "/shop": ShoppingBagIcon,
  "/ranking": AwardIcon,
  "/boards/suggestions": LightbulbIcon,
  "/advertise": HandshakeIcon,
  // 큰 묶음(모음 화면)
  "/boards/jobs": BriefcaseIcon,
  "/tools": StoreIcon,
  "/study": GraduationCapIcon,
  "/community": MessagesSquareIcon,
  "/play": Gamepad2Icon,
  "/poka": InfoIcon,
};

function NavIcon({ href, icon, active }: { href: string; icon: Parameters<typeof BrandIcon>[0]["name"]; active: boolean }) {
  const Icon = NAV_ICON[href] ?? (href === "/tools" ? CalculatorIcon : null);
  return Icon ? <Icon aria-hidden className={cn("size-[18px] shrink-0", active ? "text-[#f6efe2]" : "text-[#c9a25c]")} strokeWidth={2} /> : <BrandIcon name={icon} active={active} />;
}


export function BoardNav({
  onNavigate,
  id,
  inDrawer = false,
  compact = false,
}: {
  onNavigate?: () => void;
  id?: string;
  inDrawer?: boolean;
  /** 아이콘만(오락실에서 접힌 메뉴) */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const groups = SIDEBAR_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.href !== "/"),
  })).filter((group) => group.items.length > 0);
  const homeActive = pathname === "/";
  if (compact) {
    const all = [
      { href: "/", label: "홈", icon: "torii" as Parameters<typeof BrandIcon>[0]["name"], group: null as (typeof groups)[number] | null },
      ...groups.map((g) => ({ href: g.hub ?? g.items[0].href, label: g.title ?? "", icon: g.icon ?? g.items[0].icon, group: g })),
    ];
    return (
      <nav id={id} aria-label="전체 게시판(접힘)" data-nav-compact className="flex flex-col items-center gap-1 py-2">
        {all.map((item) => {
          const active = item.href === "/" ? homeActive : item.group ? sidebarGroupActive(pathname, item.group) : false;
          return (
            <a
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={cn("grid size-10 place-items-center rounded-xl", active ? "bg-[#7a1c22]" : "hover:bg-[#2a2017]")}
            >
              <NavIcon href={item.href} icon={item.icon} active={active} />
            </a>
          );
        })}
      </nav>
    );
  }

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
          <NavIcon href="/" icon="torii" active={homeActive} />
          <span className="flex-1">홈</span>
          <ChevronRightIcon className="size-4 opacity-80" />
        </Link>
      </div>
      <div
        className={
          inDrawer ? "flex flex-col gap-1.5 py-3" : "flex flex-col gap-1 px-3 py-3"
        }
      >
        {groups.map((group, index) => {
          const open = sidebarGroupActive(pathname, group);
          const hub = group.hub ?? group.items[0].href;
          const hubActive = pathname === hub;
          // 매장 관리는 금색으로 돋보이게(위 메뉴와 같은 느낌)
          const store = group.title === "매장 관리";
          return (
            <div key={group.title ?? `g-${index}`} data-nav-section={group.title ?? undefined}>
              <a
                href={hub}
                onClick={onNavigate}
                aria-current={hubActive ? "page" : undefined}
                className={cn(
                  "touch-target flex items-center gap-2.5 rounded-xl px-3 font-semibold transition-colors",
                  inDrawer ? "min-h-12 text-base" : "min-h-11 text-[15px]",
                  hubActive
                    ? "bg-[#7a1c22] text-[#f6efe2]"
                    : store
                      ? "border border-[#e7c98a]/70 bg-[#c9a25c]/15 text-[#f3d9a4] hover:bg-[#c9a25c]/25"
                      : open
                        ? "bg-[#2a2017] text-[#f3d9a4]"
                        : "text-[#ece3d3] hover:bg-[#2a2017] hover:text-[#e7c98a]",
                )}
              >
                <NavIcon href={hub} icon={group.icon ?? group.items[0].icon} active={hubActive} />
                <span className="flex-1">{group.title}</span>
                {open ? <ChevronDownIcon className="size-4 opacity-80" /> : <ChevronRightIcon className="size-4 opacity-60" />}
              </a>
              {open ? (
                // 지금 보는 묶음만 세부 메뉴 펼침
                <ul data-nav-sub className="mt-1 ml-4 flex flex-col gap-0.5 border-l border-[#c9a25c]/25 pl-2">
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
                      <li key={item.href}>
                        <a
                          href={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "touch-target flex items-center gap-2 rounded-lg px-2.5 font-semibold transition-colors",
                            inDrawer ? "min-h-11 text-[15px]" : "min-h-9 text-sm",
                            active ? "bg-[#7a1c22] text-[#f6efe2]" : "text-[#d9cfbd] hover:bg-[#2a2017] hover:text-[#e7c98a]",
                          )}
                        >
                          <NavIcon href={item.href} icon={item.icon} active={active} />
                          <span className="min-w-0 flex-1">{item.label}</span>
                          {item.badge ? <span className={item.badge === "HOT" ? "nav-new-badge nav-hot-badge" : "nav-new-badge"}>{item.badge === "HOT" ? "🔥 HOT" : item.badge}</span> : null}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
