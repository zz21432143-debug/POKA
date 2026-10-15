"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** 게임 화면(/games…)에서는 숨김: 전광판 · 앱 받기 띠 · 아래 메뉴가 판과 내 칸을 가리지 않게 */
export function HideOnGames({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname === "/games" || pathname.startsWith("/games/")) return null;
  return <>{children}</>;
}
