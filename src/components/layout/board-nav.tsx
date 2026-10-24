"use client";

import Link from "@/components/ui/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { SIDEBAR_NAV, navItemActive, sidebarGroupActive } from "@/lib/nav";
import { useNavHint } from "@/lib/nav-hint";
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
  CircleHelpIcon,
  CalendarSearchIcon,
  ClipboardListIcon,
  GhostIcon,
  UserPlusIcon,
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
  "/boards/jobs/slots": CalendarSearchIcon,
  "/boards/jobs/mine": ClipboardListIcon,
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
  "/quiz": CircleHelpIcon,
  "/yokai": GhostIcon,
  "/games": Gamepad2Icon,
  "/invite": UserPlusIcon,
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
  // 게시글처럼 주소만으로 모를 때 화면이 알려 주는 묶음
  const navHint = useNavHint();
  const hint = pathname.startsWith("/posts/") ? navHint : null;
  // PC(마우스): 묶음 줄에 올리면 옆으로 세부 메뉴판(화면 기준 위치 — 좌측 칸에 잘리지 않게)
  const [fly, setFly] = useState<{ title: string; top: number; left: number } | null>(null);
  const closeTimer = useRef<number | null>(null);
  const canHover = useRef(false);
  useEffect(() => {
    canHover.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);
  // 페이지가 바뀌면 메뉴판 닫기
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFly(null);
  }, [pathname]);
  const openFly = (title: string, el: HTMLElement) => {
    if (inDrawer || compact || !canHover.current) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const r = el.getBoundingClientRect();
    // 메뉴판 높이(대략: 머리 줄 + 칸마다 약 53px)만큼 화면 안에 들어오게 위로 올림
    const count = SIDEBAR_NAV.find((g) => g.title === title)?.items.length ?? 5;
    const height = 64 + count * 53;
    setFly({ title, top: Math.max(8, Math.min(r.top, window.innerHeight - height - 8)), left: r.right + 8 });
  };
  const closeFly = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setFly(null), 160);
  };
  const keepFly = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  };
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
          const active = item.href === "/" ? homeActive : item.group ? sidebarGroupActive(pathname, item.group, hint) : false;
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

  const anyGroupOpen = groups.some((group) => sidebarGroupActive(pathname, group, hint));
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
        {/* 매일 쓰는 출석체크는 묶음 안에 숨기지 않고 홈 바로 아래 */}
        <Link
          href="/attendance"
          onClick={onNavigate}
          data-nav-attendance
          className={cn(
            "touch-target mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold",
            pathname.startsWith("/attendance") ? "bg-[#7a1c22] text-[#f6efe2]" : "text-[#ece3d3] hover:bg-[#2a2017] hover:text-[#e7c98a]",
          )}
        >
          <NavIcon href="/attendance" icon="omamori" active={pathname.startsWith("/attendance")} />
          <span className="flex-1">출석체크</span>
          <span className="rounded-full bg-[#c9a25c]/20 px-2 py-0.5 text-[11px] font-black text-[#f3d9a4]">매일 P</span>
        </Link>
      </div>
      <div
        className={
          inDrawer ? "flex flex-col gap-1.5 py-3" : "flex flex-col gap-1 px-3 py-3"
        }
      >
        {groups.map((group, index) => {
          const open = sidebarGroupActive(pathname, group, hint);
          // PC 왼쪽 메뉴: 어느 묶음 안이면 그 묶음 세부 메뉴만(묶음 바꾸기는 위 메뉴와 같아서 겹치지 않게). 홈 · 휴대폰 서랍은 전체
          if (!inDrawer && anyGroupOpen && !open) return null;
          const hub = group.hub ?? group.items[0].href;
          const hubActive = pathname === hub;
          // 매장 관리는 금색으로 돋보이게(위 메뉴와 같은 느낌)
          const store = group.title === "매장 관리";
          return (
            <div
              key={group.title ?? `g-${index}`}
              data-nav-section={group.title ?? undefined}
              onMouseEnter={(e) => group.title && openFly(group.title, e.currentTarget)}
              onMouseLeave={closeFly}
            >
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
      {fly ? (() => {
        const g = groups.find((x) => x.title === fly.title);
        if (!g) return null;
        return (
          <div
            data-nav-flyout={g.title}
            onMouseEnter={keepFly}
            onMouseLeave={closeFly}
            className="fixed z-[60] w-72 rounded-2xl border border-[#c9a25c]/40 bg-[#1d1611]/98 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur"
            style={{ top: Math.max(8, fly.top), left: fly.left, maxHeight: "calc(100vh - 16px)", overflowY: "auto" }}
          >
            <a href={g.hub ?? g.items[0].href} className="mb-1 flex min-h-10 items-center justify-between rounded-lg px-3 text-sm font-black text-[#f3d9a4] hover:bg-[#2a2017]">
              {g.title} 전체 보기
              <ChevronRightIcon className="size-4" />
            </a>
            <ul className="grid gap-0.5">
              {g.items.map((item) => {
                const active = navItemActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={cn(
                        "flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-1.5",
                        active ? "bg-[#7a1c22] text-[#f6efe2]" : "text-[#ece3d3] hover:bg-[#2a2017]",
                      )}
                    >
                      <NavIcon href={item.href} icon={item.icon} active={active} />
                      <span className="grid min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[15px] font-bold">
                          {item.label}
                          {item.badge ? <span className={item.badge === "HOT" ? "nav-new-badge nav-hot-badge" : "nav-new-badge"}>{item.badge === "HOT" ? "🔥 HOT" : item.badge}</span> : null}
                        </span>
                        {item.hint ? <span className="truncate text-xs text-[#a89c88]">{item.hint}</span> : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })() : null}
    </nav>
  );
}
