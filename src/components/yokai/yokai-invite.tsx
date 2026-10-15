"use client";

import { useEffect, useState, type ReactNode } from "react";

const KEY = "poka-yokai-invite-closed";

/** 「요괴 마을이 열렸어요」 초대: 닫으면 이 기기에서 다시 안 보임 */
export function YokaiInvite({ children }: { children: ReactNode }) {
  const [closed, setClosed] = useState(true);
  useEffect(() => {
    let hidden = false;
    try {
      hidden = window.localStorage.getItem(KEY) === "1";
    } catch {
      /* 저장소를 못 쓰면 보여 줌 */
    }
    const id = window.setTimeout(() => setClosed(hidden), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (closed) return null;
  return (
    <div className="relative" data-yokai-invite>
      {children}
      <button
        type="button"
        aria-label="닫기"
        data-yokai-invite-close
        onClick={() => {
          setClosed(true);
          try {
            window.localStorage.setItem(KEY, "1");
          } catch {
            /* 무시 */
          }
        }}
        className="absolute -right-1.5 -top-1.5 tap-pad grid size-8 place-items-center rounded-full border border-[#c9a25c]/50 bg-black text-xs text-zinc-300"
      >
        ✕
      </button>
    </div>
  );
}
