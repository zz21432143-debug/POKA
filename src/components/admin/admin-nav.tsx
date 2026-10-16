"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";

type Item = { href: string; label: string; master?: boolean };
/** 관리자 메뉴: 하는 일별로 묶음(모든 관리자 화면 위에 같은 메뉴) */
export const ADMIN_GROUPS: { title: string; icon: string; items: Item[] }[] = [
  { title: "홈", icon: "🛠", items: [{ href: "/admin", label: "관리 홈" }] },
  {
    title: "회원",
    icon: "👥",
    items: [
      { href: "/admin/members", label: "회원 목록 · 닉네임", master: true },
      { href: "/admin/points", label: "포인트 지급 · 마크 환불", master: true },
      { href: "/admin?tab=sanctions", label: "제재(정지 · 차단)" },
      { href: "/admin?tab=reports", label: "신고 처리" },
    ],
  },
  {
    title: "콘텐츠",
    icon: "📝",
    items: [
      { href: "/admin/content", label: "콘텐츠 발행", master: true },
      { href: "/admin/quiz", label: "퀴즈 관리" },
      { href: "/admin/banners", label: "배너" },
      { href: "/admin?tab=words", label: "금지어" },
    ],
  },
  {
    title: "랭킹 · 게임",
    icon: "🏆",
    items: [
      { href: "/admin/titles", label: "칭호 · 랭킹 설정" },
      { href: "/admin/games", label: "오락실 관리 · 보상", master: true },
      { href: "/admin/yokai", label: "요괴 마을 통계" },
    ],
  },
  {
    title: "통계 · 감시",
    icon: "📊",
    items: [
      { href: "/admin/stats", label: "방문 · 가입 · 유입" },
      { href: "/admin/errors", label: "오류 · 이상 감시" },
      { href: "/admin/adsense", label: "애드센스 점검" },
      { href: "/admin/inquiries", label: "광고 문의" },
    ],
  },
  {
    title: "사이트",
    icon: "⚙️",
    items: [
      { href: "/admin?tab=settings", label: "사이트 설정", master: true },
      { href: "/admin/push", label: "알림 보내기", master: true },
      { href: "/admin/cleanup", label: "데이터 정리", master: true },
      { href: "/admin/launch", label: "오픈 준비", master: true },
    ],
  },
];

/** 지금 화면이 이 메뉴인지(?tab= 포함) */
function isActive(href: string, pathname: string, tab: string | null) {
  const [path, query] = href.split("?");
  if (path !== pathname) return false;
  const want = query ? new URLSearchParams(query).get("tab") : null;
  if (path === "/admin") return (want ?? "home") === (tab ?? "home");
  return true;
}

export function AdminNav({ isMaster, badges = {} }: { isMaster?: boolean; current?: string; badges?: Record<string, number> }) {
  const pathname = usePathname() ?? "";
  const tab = useSearchParams()?.get("tab") ?? null;
  const [open, setOpen] = useState(false);
  const current = ADMIN_GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href, pathname, tab));
  const totalBadge = Object.values(badges).reduce((a, b) => a + b, 0);
  return (
    <nav data-admin-nav aria-label="관리자 메뉴" className="grid gap-2 rounded-2xl border border-border bg-[#151213] p-3">
      {/* 휴대폰: 지금 화면 이름만 보이고 눌러서 펼침(옆으로 밀지 않아도 되게) */}
      <button type="button" data-admin-nav-toggle aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-11 items-center gap-2 rounded-xl bg-muted/40 px-3 text-sm font-bold sm:hidden">
        🛠 {current?.label ?? "관리자 메뉴"}
        {totalBadge ? <span className="grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">{totalBadge}</span> : null}
        <span className="ml-auto text-xs text-muted-foreground">{open ? "접기 ▲" : "메뉴 펼치기 ▼"}</span>
      </button>
      {ADMIN_GROUPS.map((g) => {
        const items = g.items.filter((i) => !i.master || isMaster);
        if (!items.length) return null;
        return (
          <div key={g.title} className={cn("flex-wrap items-center gap-1.5 sm:flex sm:flex-nowrap sm:overflow-x-auto sm:whitespace-nowrap [scrollbar-width:none]", open ? "flex" : "hidden")}>
            <span className="w-full shrink-0 text-xs font-black text-muted-foreground sm:w-20">
              {g.icon} {g.title}
            </span>
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold",
                  isActive(i.href, pathname, tab) ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted",
                )}
              >
                {i.label}
                {badges[i.href] ? (
                  <span data-admin-badge={i.href} className="ml-1.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
                    {badges[i.href]}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
