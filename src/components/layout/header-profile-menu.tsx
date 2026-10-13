"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDownIcon, UserRoundIcon } from "lucide-react";
import { cn } from "cn";

/**
 * 머리줄 "내정보": 누르면 아래로 내 정보 칸(레벨 · 포인트 · 출석 · 버튼)이 펼쳐집니다.
 * 예전 오른쪽 칸에 늘 떠 있던 것을 필요할 때만 보이게 해서 화면을 넓게 씁니다.
 */
export function HeaderProfileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // 다른 페이지로 가면 닫기
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="내 정보"
        onClick={() => setOpen((v) => !v)}
        className="btn-3d inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-[#1c1914] sm:px-3"
      >
        <UserRoundIcon className="size-4" />
        <span className="hidden sm:inline">내정보</span>
        <ChevronDownIcon className={cn("hidden size-3.5 transition-transform sm:block", open && "rotate-180")} />
      </button>
      {open ? (
        <div data-profile-menu role="dialog" aria-label="내 정보" className="absolute top-[calc(100%+0.5rem)] right-0 z-50 grid w-[min(20rem,calc(100vw-1rem))] gap-2 rounded-[1.4rem] border border-[#c9a25c]/40 bg-[#17110d] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,.6)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
