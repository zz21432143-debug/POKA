"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "cn";

/**
 * 도구 화면의 팝업 창. body에 바로 띄워 위 헤더 · 아래 메뉴에 가리지 않게 합니다. className을 주면 위치·여백(place-items · p)을 그걸로 바꿉니다
 * (페이지 안에 두면 바깥 레이어 때문에 휴대폰에서 위아래가 잘렸습니다).
 */
export function ToolDialog({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  // 창은 눌러서 여는 것이라 서버 렌더에는 없습니다.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-[95] grid overflow-y-auto bg-black/70 text-white", className ?? "place-items-center p-4")} role="dialog" aria-modal="true" aria-label={label}>
      {children}
    </div>,
    document.body,
  );
}
