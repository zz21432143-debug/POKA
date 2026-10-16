"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";

type Tab = { key: string; label: string; node: ReactNode };
const KEY = "poka-home-tab";

/** 홈 오른쪽 작은 탭 상자: 퀴즈 · 미션 · 랭킹 · 게임방 — 한 번에 하나만 보여서 공간을 아낌(고른 탭 기억) */
export function HomeTabs({ tabs }: { tabs: Tab[] }) {
  const [cur, setCur] = useState(tabs[0]?.key ?? "");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 고른 탭은 브라우저에만 저장
      if (saved && tabs.some((t) => t.key === saved)) setCur(saved);
    } catch {
      /* 무시 */
    }
  }, [tabs]);
  const pick = (k: string) => {
    setCur(k);
    try {
      localStorage.setItem(KEY, k);
    } catch {
      /* 무시 */
    }
  };
  return (
    <section data-home-tabs className="lounge-card flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] lg:absolute lg:inset-0">
      <div role="tablist" aria-label="오늘 할 것" className="grid shrink-0 grid-cols-4 gap-1 border-b border-[#c9a25c]/20 p-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={cur === t.key}
            data-home-tab={t.key}
            onClick={() => pick(t.key)}
            className={cn(
              "min-h-9 rounded-lg px-1 text-[12.5px] font-black whitespace-nowrap",
              cur === t.key ? "bg-[#7a1c22] text-white" : "text-[#d8c9ae] hover:bg-white/5",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          hidden={cur !== t.key}
          // 안쪽 칸은 테두리 · 배경을 빼서 상자 안에 그대로 들어가게 · 길면 상자 안에서 스크롤
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!shadow-none"
        >
          {t.node}
        </div>
      ))}
    </section>
  );
}
