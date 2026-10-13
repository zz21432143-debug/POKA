"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { DIFFICULTY } from "@/lib/practice";
import { DEFAULT_TITLE_CONFIG, PERIOD_LABEL, type TitleConfig } from "@/lib/pot-title-config";

/** 팟 계산 칭호 정보(관리자 설정 + 지금 칭호 받는 사람: 닉네임 → 순위) */
export type PotTitleInfo = Pick<TitleConfig, "enabled" | "names" | "difficulty" | "period"> & { holders: Record<string, 1 | 2 | 3> };
const EMPTY_TITLES: PotTitleInfo = { ...DEFAULT_TITLE_CONFIG, holders: {} };

const CrownContext = createContext<ReadonlySet<string>>(new Set());
const PotTitleContext = createContext<PotTitleInfo>(EMPTY_TITLES);

export function CrownProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  const [potTitle, setPotTitle] = useState<PotTitleInfo>(EMPTY_TITLES);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranking/crowns")
      .then((response) => response.json())
      .then((payload: { nicknames?: string[]; potTitle?: PotTitleInfo | null }) => {
        if (cancelled) return;
        setNames(new Set(payload.nicknames ?? []));
        if (payload.potTitle) setPotTitle(payload.potTitle);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <CrownContext.Provider value={names}>
      <PotTitleContext.Provider value={potTitle}>{children}</PotTitleContext.Provider>
    </CrownContext.Provider>
  );
}

/** 칭호 설정(이름 · 기준 난이도 · 기간)과 받는 사람 */
export function usePotTitleInfo() {
  return useContext(PotTitleContext);
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
const TITLE_ICON: Record<1 | 2 | 3, string> = { 1: "👹", 2: "🪙", 3: "🏮" };

/** 닉네임 옆 팟 계산 칭호(설정한 난이도 랭킹 1~3위). 관리자가 끄면 안 보임 */
export function PotTitleBadge({ nickname, className }: { nickname: string; className?: string }) {
  const info = useContext(PotTitleContext);
  const rank = info.enabled ? info.holders[nickname] : undefined;
  if (!rank) return null;
  return (
    <span
      data-pot-title={rank}
      title={`팟 계산 ${DIFFICULTY[info.difficulty].label} 랭킹(${PERIOD_LABEL[info.period]}) ${rank}위`}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] font-black whitespace-nowrap", TITLE_TONE[rank], className)}
    >
      {TITLE_ICON[rank]} {info.names[rank]}
    </span>
  );
}
