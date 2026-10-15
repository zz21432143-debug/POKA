"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

/** 휴대폰에서만 접어 두는 칸(PC에서는 늘 펼침). 접혔을 때는 제목 한 줄만 */
export function MobileFold({
  title,
  hint,
  children,
  data,
}: {
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  data?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div data-mobile-fold={data}>
      {open ? null : (
        <button
          type="button"
          data-mobile-fold-open
          onClick={() => setOpen(true)}
          className="lounge-card flex min-h-14 w-full items-center gap-2 rounded-[1.35rem] px-4 text-left lg:hidden"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-white">{title}</span>
            {hint ? (
              <span className="block truncate text-xs text-zinc-400">
                {hint}
              </span>
            ) : null}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-[#e7c98a]">
            펼치기
            <ChevronDownIcon className="size-4" />
          </span>
        </button>
      )}
      <div className={open ? undefined : "hidden lg:block"}>{children}</div>
    </div>
  );
}
