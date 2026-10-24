"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BoardNav } from "@/components/layout/board-nav";

const KEY = "poka-games-nav";
const TOOLS_KEY = "poka-tools-nav";

/** 게임 판(오목 · 윷놀이 방 · AI 대국) — 왼쪽 메뉴를 완전히 숨기는 몰입 모드 */
export function isGameRoom(pathname: string) {
  return /^\/games\/(omok|yut)\/(?!join$)[^/]+$/.test(pathname);
}

/**
 * 왼쪽 메뉴(PC):
 * - 보통 화면: 그대로
 * - 요괴 오락실 로비 · 딜러 로테이션 · 게임 현황판: 아이콘만 남기고 접힘(◀ / ▶ 로 펼치기 · 기억함) → 게임 화면이 넓어짐
 * - 실제 판(방 · AI 대국): 완전히 숨김(몰입 모드)
 */
export function SidebarRail({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  // 접는 화면: 요괴 오락실 · 딜러 로테이션 · 게임 현황판(넓은 표 · TV 화면이라 메뉴는 아이콘만)
  const tools = pathname.startsWith("/tools/rotation") || pathname.startsWith("/tools/board");
  const games = pathname === "/games" || pathname.startsWith("/games/") || tools;
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 펼침 설정은 화면이 뜬 뒤에만 읽을 수 있음
      setOpen(window.localStorage.getItem(tools ? TOOLS_KEY : KEY) === "open");
    } catch {
      /* 기본은 접힘 */
    }
  }, [tools]);
  if (!games) return <aside className="hidden w-[16rem] shrink-0 lg:flex lg:flex-col lg:gap-3">{children}</aside>;
  if (isGameRoom(pathname)) return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(tools ? TOOLS_KEY : KEY, next ? "open" : "closed");
    } catch {
      /* 이번만 */
    }
  };
  return (
    <aside data-games-sidebar={open ? "open" : "closed"} className={open ? "hidden w-[16rem] shrink-0 lg:flex lg:flex-col lg:gap-3" : "hidden w-14 shrink-0 lg:flex lg:flex-col lg:gap-2"}>
      <button
        type="button"
        data-games-sidebar-toggle
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? "메뉴 접기" : "메뉴 펼치기"}
        title={open ? "메뉴 접기" : "메뉴 펼치기"}
        className="wood-frame grid min-h-10 place-items-center text-sm font-black text-[#e7c98a] hover:text-white"
      >
        {open ? "◀ 메뉴 접기" : "▶"}
      </button>
      {open ? (
        children
      ) : (
        <div className="wood-frame">
          <BoardNav compact />
        </div>
      )}
    </aside>
  );
}
