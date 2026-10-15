"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
  holders: Record<string, { key: string; rank: number }[]>;
  /** 닉네임 → 대표 칭호(랭킹 칭호 키 또는 "pot") */
  main?: Record<string, string>;
};
const EMPTY_HONORS: HonorInfo = { defs: [], holders: {} };

/** 닉네임 → 대표 요괴(종류 · 단계). 요괴 마을 공개 전에는 비어 있음 */
export type YokaiReps = Record<string, { s: string; st: number }>;
const YokaiRepContext = createContext<YokaiReps>({});

/** 이 회원이 지금 가진 칭호(대표 칭호 고르기용): 키 · 보이는 이름 */
export function useMyTitles(nickname: string) {
  const honors = useContext(HonorContext);
  const pot = useContext(PotTitleContext);
  const hydrated = useHydrated();
  if (!hydrated) return { list: [] as { key: string; label: string }[], main: "" };
  const defs = new Map(honors.defs.map((d) => [d.key, d]));
  const list: { key: string; label: string }[] = [];
  const potRank = pot.enabled ? pot.holders[nickname] : undefined;
  if (potRank) list.push({ key: "pot", label: `${TITLE_ICON[potRank]} ${pot.names[potRank]}` });
  for (const h of honors.holders[nickname] ?? []) {
    const d = defs.get(h.key);
    if (d) list.push({ key: d.key, label: `${d.icon} ${d.name}${h.rank > 1 ? ` · ${h.rank}위` : ""}` });
  }
  return { list, main: honors.main?.[nickname] ?? "" };
}
const HonorContext = createContext<HonorInfo>(EMPTY_HONORS);
/** 대표 칭호를 고르면 서버 반영(최대 1분)을 기다리지 않고 내 화면에 바로 */
const SetHonorMainContext = createContext<(nickname: string, key: string) => void>(() => {});
export function useSetHonorMain() {
  return useContext(SetHonorMainContext);
}

export function CrownProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  const [potTitle, setPotTitle] = useState<PotTitleInfo>(EMPTY_TITLES);
  const [honors, setHonors] = useState<HonorInfo>(EMPTY_HONORS);
  const [yokaiReps, setYokaiReps] = useState<YokaiReps>({});
  const setMain = useCallback((nickname: string, key: string) => setHonors((h) => ({ ...h, main: { ...(h.main ?? {}), [nickname]: key } })), []);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranking/crowns")
      .then((response) => response.json())
      .then((payload: { nicknames?: string[]; potTitle?: PotTitleInfo | null; honors?: HonorInfo | null; yokai?: YokaiReps }) => {
        if (cancelled) return;
        setNames(new Set(payload.nicknames ?? []));
        if (payload.potTitle) setPotTitle(payload.potTitle);
        if (payload.honors) setHonors(payload.honors);
        if (payload.yokai) setYokaiReps(payload.yokai);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <CrownContext.Provider value={names}>
      <PotTitleContext.Provider value={potTitle}>
        <HonorContext.Provider value={honors}>
          <SetHonorMainContext.Provider value={setMain}>
            <YokaiRepContext.Provider value={yokaiReps}>{children}</YokaiRepContext.Provider>
          </SetHonorMainContext.Provider>
        </HonorContext.Provider>
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
export function PotTitleBadge({ nickname, className, max = 2, yokai = true }: { nickname: string; className?: string; max?: number; /** 대표 요괴 그림도(게임 화면처럼 요괴가 이미 보이면 끔) */ yokai?: boolean }) {
  const honors = useContext(HonorContext);
  const potInfo = useContext(PotTitleContext);
  const yokaiReps = useContext(YokaiRepContext);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const hasPot = Boolean(potInfo.enabled && potInfo.holders[nickname]);
  const defs = new Map(honors.defs.map((d) => [d.key, d]));
  const mine = (honors.holders[nickname] ?? []).flatMap((h) => {
    const d = defs.get(h.key);
    return d ? [{ ...d, rank: h.rank }] : [];
  });
  // 대표 칭호를 골랐으면 맨 앞에(팟 계산 칭호를 골랐으면 그대로 팟 칭호가 먼저)
  const main = honors.main?.[nickname] ?? "";
  const potFirst = hasPot && (main === "" || main === "pot" || !mine.some((d) => d.key === main));
  if (main && main !== "pot") mine.sort((a, b) => Number(b.key === main) - Number(a.key === main));
  const honorSlots = Math.max(0, max - (hasPot ? 1 : 0));
  const honorBadges = mine.slice(0, hasPot && !potFirst ? max - 1 : honorSlots).map((d) => (
    <TipBadge
      key={d.key}
      data={{ "data-honor": d.key, "data-honor-rank": d.rank }}
      tip={`${d.rank > 1 ? d.desc.replace("1위", `${d.rank}위`) : d.desc}로 받은 칭호`}
      className={cn(HONOR_TONE, className)}
    >
      {d.icon} {d.name}
      {d.rank > 1 ? <span className="opacity-80">· {d.rank}위</span> : null}
    </TipBadge>
  ));
  const rep = yokai ? yokaiReps[nickname] : undefined;
  return (
    <>
      {rep ? (
        // eslint-disable-next-line @next/next/no-img-element -- 대표 요괴(작은 도트 그림)
        <img data-yokai-rep={rep.s} src={`/yokai/${rep.s}-${rep.st}.webp`} alt="" title="대표 요괴" className="inline-block size-5 shrink-0 object-contain align-middle" />
      ) : null}
      {potFirst ? <PotOnlyBadge nickname={nickname} className={className} /> : null}
      {honorBadges.slice(0, 1)}
      {!potFirst && hasPot && max > 1 ? <PotOnlyBadge nickname={nickname} className={className} /> : null}
      {honorBadges.slice(1)}
    </>
  );
}

/** 팟 계산 칭호만 */
function PotOnlyBadge({ nickname, className }: { nickname: string; className?: string }) {
  const info = useContext(PotTitleContext);
  const rank = info.enabled ? info.holders[nickname] : undefined;
  if (!rank) return null;
  return (
    <TipBadge
      data={{ "data-pot-title": rank }}
      tip={`팟 계산 ${DIFFICULTY[info.difficulty].label} 랭킹(${PERIOD_LABEL[info.period]}) ${rank}위로 받은 칭호`}
      className={cn(TITLE_TONE[rank], className)}
    >
      {TITLE_ICON[rank]} {info.names[rank]}
    </TipBadge>
  );
}

/**
 * 칭호 배지: 누르면(휴대폰) · 마우스를 올리면(PC) 어떤 랭킹 몇 위로 받은 칭호인지 작은 안내.
 * 목록 줄 링크 위에 있어도 누를 때 글로 넘어가지 않게 막음. 3초 뒤 저절로 닫힘.
 */
function TipBadge({ tip, className, data, children }: { tip: string; className?: string; data: Record<string, string | number>; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(false), 3000);
    return () => window.clearTimeout(timer);
  }, [open]);
  return (
    <span
      {...data}
      role="button"
      tabIndex={0}
      title={tip}
      aria-expanded={open}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
      onBlur={() => setOpen(false)}
      className={cn("relative z-20 inline-flex shrink-0 cursor-help items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] font-black whitespace-nowrap", className)}
    >
      {children}
      {open ? (
        <span role="tooltip" data-title-tip className="absolute top-full left-0 z-50 mt-1 w-max max-w-[15rem] rounded-lg border border-[#c9a25c]/50 bg-[#120d0a] px-2 py-1 text-[11px] font-bold whitespace-normal text-white shadow-lg">
          {tip}
        </span>
      ) : null}
    </span>
  );
}

/** 미니게임 1위 칭호(이번 달 오목 · 윷놀이 랭킹 1위 한 명만): 게임 화면 닉네임 위 금빛 픽셀 배지 */
export function GameChampionBadge({ nickname, game, className }: { nickname: string; game: "omok" | "yut" | "chess"; className?: string }) {
  const honors = useContext(HonorContext);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  const hold = (honors.holders[nickname] ?? []).find((h) => h.key === game);
  const def = honors.defs.find((d) => d.key === game);
  if (!hold || !def) return null;
  return (
    <span
      data-game-champion={game}
      title={def.desc}
      className={cn("yut-title inline-flex w-fit max-w-full items-center gap-0.5 truncate bg-[#0a0614] px-1 text-[10px] leading-4 font-black text-[#ffcf4a]", className)}
    >
      👑 {def.icon} {def.name} · 1위
    </span>
  );
}
