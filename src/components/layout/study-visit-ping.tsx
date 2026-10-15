"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { STUDY_ITEMS } from "@/lib/nav";

/** 홀덤 공부 도구 화면을 열면 하루 한 번 기록(로그인 안 했으면 서버가 무시) */
export function StudyVisitPing() {
  const pathname = usePathname();
  useEffect(() => {
    if (!STUDY_ITEMS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) return;
    const key = `poka-study-${new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      /* 저장소를 못 쓰면 그냥 보냄(서버가 하루 한 줄만 남김) */
    }
    void fetch("/api/study-visit", { method: "POST" }).catch(() => undefined);
  }, [pathname]);
  return null;
}
