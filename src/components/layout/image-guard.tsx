"use client";

import { useEffect } from "react";

/** 요괴 그림 · 마을 배경: 우클릭(PC) · 꾹 누르기 메뉴(휴대폰) · 끌어서 저장 막기 */
const GUARDED = 'img[src*="/yokai/"], [data-yokai-home], [data-home-yokai], [data-yokai-bg-thumb], [data-yokai-arrival], [data-yokai-evolved], [data-yokai-guest], [data-profile-yokai], [data-yokai-confirm-main]';

export function ImageGuard() {
  useEffect(() => {
    const guarded = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(GUARDED)) && target.closest("img, [style*='url(']") !== null;
    const block = (event: Event) => {
      if (guarded(event.target)) event.preventDefault();
    };
    document.addEventListener("contextmenu", block, { capture: true });
    document.addEventListener("dragstart", block, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", block, { capture: true });
      document.removeEventListener("dragstart", block, { capture: true });
    };
  }, []);
  return null;
}
