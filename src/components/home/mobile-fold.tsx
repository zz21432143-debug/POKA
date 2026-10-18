"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

/** 메인 위쪽 작은 한 칸(휴대폰 · PC 모두). 누르면 그 자리에서 펼침 — 옆 칸과 나란히 있다가 펼치면 한 줄을 다 씀(부모가 data-open으로) */
export function MobileFold({
  title,
  sub,
  hint,
  children,
  data,
}: {
  title: ReactNode;
  sub?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  data?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div data-mobile-fold={data} data-open={open ? "true" : undefined} className="min-w-0">
      {open ? (
        children
      ) : (
        <button
          type="button"
          data-mobile-fold-open
          onClick={() => setOpen(true)}
          className="lounge-card flex min-h-14 w-full items-center gap-2 rounded-[1.35rem] px-3 py-1 text-left hover:border-[#c9a25c]"
        >
          <span className="grid min-w-0 flex-1">
            <span className="truncate text-[13px] leading-tight font-black text-white">{title}</span>
            {sub ? <span className="truncate text-[11.5px] font-bold">{sub}</span> : null}
            {hint ? <span className="hidden truncate text-xs text-zinc-400 lg:block">{hint}</span> : null}
          </span>
          <ChevronDownIcon aria-label="펼치기" className="size-4 shrink-0 text-[#e7c98a]" />
        </button>
      )}
    </div>
  );
}
