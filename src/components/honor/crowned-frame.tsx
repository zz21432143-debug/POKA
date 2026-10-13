"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { POT_TITLES } from "@/lib/practice";

const CrownContext = createContext<ReadonlySet<string>>(new Set());
/** 팟 계산(지옥) 랭킹 1~3위 칭호: 닉네임 → 순위 */
const PotTitleContext = createContext<Readonly<Record<string, 1 | 2 | 3>>>({});

export function CrownProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  const [potTitles, setPotTitles] = useState<Readonly<Record<string, 1 | 2 | 3>>>({});
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranking/crowns")
      .then((response) => response.json())
      .then((payload: { nicknames?: string[]; potTitles?: Record<string, 1 | 2 | 3> }) => {
        if (cancelled) return;
        setNames(new Set(payload.nicknames ?? []));
        setPotTitles(payload.potTitles ?? {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <CrownContext.Provider value={names}>
      <PotTitleContext.Provider value={potTitles}>{children}</PotTitleContext.Provider>
    </CrownContext.Provider>
  );
}

export function CrownedFrame({
  nickname,
  aura = "",
  children,
}: {
  nickname: string;
  aura?: string;
  children: ReactNode;
}) {
  const names = useContext(CrownContext);
  return <span className={cn("honor-mark", aura, names.has(nickname) && "rank-crown")}>{children}</span>;
}

const TITLE_TONE: Record<1 | 2 | 3, string> = {
  1: "border-amber-300 bg-gradient-to-r from-[#7f1d1d] to-[#b45309] text-amber-100 shadow-[0_0_8px_rgba(251,191,36,.45)]",
  2: "border-zinc-300 bg-gradient-to-r from-zinc-700 to-zinc-500 text-white",
  3: "border-orange-400 bg-gradient-to-r from-[#5c2a12] to-[#9a4a1c] text-orange-100",
};

/** 닉네임 옆 팟 계산 칭호(지옥 랭킹 1~3위) — 1위 팟의 오니(鬼) · 2위 칩 요괴 · 3위 사이드팟 도깨비 */
export function PotTitleBadge({ nickname, rank: forced, className }: { nickname: string; rank?: 1 | 2 | 3; className?: string }) {
  const titles = useContext(PotTitleContext);
  const rank = forced ?? titles[nickname];
  if (!rank) return null;
  return (
    <span
      data-pot-title={rank}
      title={`팟 계산 지옥 랭킹 ${rank}위`}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] font-black whitespace-nowrap", TITLE_TONE[rank], className)}
    >
      {rank === 1 ? "👹" : rank === 2 ? "🪙" : "🏮"} {POT_TITLES[rank]}
    </span>
  );
}
