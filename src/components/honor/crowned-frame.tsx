"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "cn";
import { DIFFICULTY } from "@/lib/practice";
import { DEFAULT_TITLE_CONFIG, PERIOD_LABEL, type TitleConfig } from "@/lib/pot-title-config";

/** 팟 계산 칭호 정보(관리자 설정 + 지금 칭호 받는 사람: 닉네임 → 순위) */
export type PotTitleInfo = Pick<TitleConfig, "enabled" | "names" | "difficulty" | "period"> & { holders: Record<string, 1 | 2 | 3> };
const EMPTY_TITLES: PotTitleInfo = { ...DEFAULT_TITLE_CONFIG, holders: {} };

const CrownContext = createContext<ReadonlySet<string>>(new Set());
const PotTitleContext = createContext<PotTitleInfo>(EMPTY_TITLES);

/** 랭킹 칭호(레벨 · 경험치 · 마크 · 출석 1위): 정의와 받는 사람 */
export type HonorInfo = {
  defs: { key: string; icon: string; name: string; desc: string }[];
  holders: Record<string, string[]>;
};
const EMPTY_HONORS: HonorInfo = { defs: [], holders: {} };
const HonorContext = createContext<HonorInfo>(EMPTY_HONORS);

export function CrownProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  const [potTitle, setPotTitle] = useState<PotTitleInfo>(EMPTY_TITLES);
  const [honors, setHonors] = useState<HonorInfo>(EMPTY_HONORS);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranking/crowns")
      .then((response) => response.json())
      .then((payload: { nicknames?: string[]; potTitle?: PotTitleInfo | null; honors?: HonorInfo | null }) => {
        if (cancelled) return;
        setNames(new Set(payload.nicknames ?? []));
        if (payload.potTitle) setPotTitle(payload.potTitle);
        if (payload.honors) setHonors(payload.honors);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <CrownContext.Provider value={names}>
      <PotTitleContext.Provider value={potTitle}>
        <HonorContext.Provider value={honors}>{children}</HonorContext.Provider>
      </PotTitleContext.Provider>
    </CrownContext.Provider>
  );
}

/**
 * 화면 연결(hydration)이 끝났는지. 늦게 도착하는 칸(Suspense)이 연결될 때 왕관 · 칭호를 이미 받아 둔 상태면
 * 서버 HTML(왕관 · 칭호 없음)과 달라 React 418 오류가 나므로, 연결이 끝난 뒤에만 그립니다.
 */
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
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
  const hydrated = useHydrated();
  return <span className={cn("honor-mark", aura, hydrated && names.has(nickname) && "rank-crown")}>{children}</span>;
}

const TITLE_TONE: Record<1 | 2 | 3, string> = {
  1: "border-amber-300 bg-gradient-to-r from-[#7f1d1d] to-[#b45309] text-amber-100 shadow-[0_0_8px_rgba(251,191,36,.45)]",
  2: "border-zinc-300 bg-gradient-to-r from-zinc-700 to-zinc-500 text-white",
  3: "border-orange-400 bg-gradient-to-r from-[#5c2a12] to-[#9a4a1c] text-orange-100",
};
const TITLE_ICON: Record<1 | 2 | 3, string> = { 1: "👹", 2: "🪙", 3: "🏮" };

/** 칭호 배지(순위·이름으로) — 랭킹·안내에서 */
export function TitleChip({ rank, name, className }: { rank: 1 | 2 | 3; name: string; className?: string }) {
  return (
    <span data-pot-title={rank} className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] font-black whitespace-nowrap", TITLE_TONE[rank], className)}>
      {TITLE_ICON[rank]} {name}
    </span>
  );
}

const HONOR_TONE = "border-sky-300/70 bg-gradient-to-r from-[#1e1b4b] to-[#3b0764] text-sky-100";

/**
 * 닉네임 옆 칭호들: 팟 계산 칭호(1~3위) + 랭킹 칭호(레벨 · 경험치 · 마크 · 출석 1위).
 * 목록에서는 max개까지만(기본 2). 관리자가 끈 칭호는 안 보임.
 */
export function PotTitleBadge({ nickname, className, max = 2 }: { nickname: string; className?: string; max?: number }) {
  const honors = useContext(HonorContext);
  const potInfo = useContext(PotTitleContext);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const hasPot = Boolean(potInfo.enabled && potInfo.holders[nickname]);
  const defs = new Map(honors.defs.map((d) => [d.key, d]));
  const mine = (honors.holders[nickname] ?? []).map((k) => defs.get(k)).filter((d) => d != null);
  return (
    <>
      <PotOnlyBadge nickname={nickname} className={className} />
      {mine.slice(0, Math.max(0, max - (hasPot ? 1 : 0))).map((d) => (
        <span
          key={d.key}
          data-honor={d.key}
          title={d.desc}
          className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] font-black whitespace-nowrap", HONOR_TONE, className)}
        >
          {d.icon} {d.name}
        </span>
      ))}
    </>
  );
}

/** 팟 계산 칭호만 */
function PotOnlyBadge({ nickname, className }: { nickname: string; className?: string }) {
  const info = useContext(PotTitleContext);
  const rank = info.enabled ? info.holders[nickname] : undefined;
  if (!rank) return null;
  return (
    <span
      data-pot-title={rank}
      title={`팟 계산 ${DIFFICULTY[info.difficulty].label} 랭킹(${PERIOD_LABEL[info.period]}) ${rank}위`}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] font-black whitespace-nowrap", TITLE_TONE[rank], className)}
    >
      {TITLE_ICON[rank]} {info.names[rank]}
    </span>
  );
}
