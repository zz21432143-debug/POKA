"use client";

import { useEffect } from "react";
import { BUILD_ID } from "@/lib/build-id";

const CHECK_MS = 5 * 60 * 1000;

/** 입력 중(글쓰기 · 계산기 칸 등)이면 새로고침하지 않음 — 쓰던 내용이 날아가지 않게 */
function typing() {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * 새 배포가 올라오면 화면을 새로 고칩니다.
 * 설치 앱 · 오래 켜 둔 탭이 예전 화면에 머무르지 않게, 앱으로 돌아올 때(화면이 다시 보일 때)와 5분마다 확인합니다.
 * 글쓰기 · 수정 · 관리자 화면에서는 쓰던 내용이 사라지지 않게 자동으로 고치지 않습니다.
 */
export function VersionRefresh() {
  useEffect(() => {
    if (BUILD_ID === "dev") return;
    let stale = false;
    const safePage = () => !/\/(write|edit)(\/|$)|^\/admin|^\/account/.test(window.location.pathname);
    const check = async () => {
      if (document.hidden) return;
      if (!stale) {
        const res = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
        const json = res?.ok ? ((await res.json().catch(() => null)) as { build?: string } | null) : null;
        if (json?.build && json.build !== BUILD_ID) stale = true;
      }
      if (stale && safePage() && !typing()) window.location.reload();
    };
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = window.setInterval(() => void check(), CHECK_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
