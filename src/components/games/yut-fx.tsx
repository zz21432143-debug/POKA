"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PixelBurst, seeded } from "@/components/games/pixel-burst";
import { TEAM_COLOR, YokaiToken } from "@/components/games/yut-board";
import { YUT_NAMES, type Team } from "@/lib/yut";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";

type Face = { species: YokaiSpecies; stage: number } | null;

const DUST = ["#d9b980", "#a9844f", "#6e5232", "#f1e2bd"];

/**
 * 윷 던지기 연출(판 위): 멍석이 깔리고 → 윷가락 4개가 솟구쳐 회전 → 0.7초쯤 멍석에 「팍!」 꽂힘
 * → 화면 진동 0.15초 · 픽셀 먼지 → 윷가락 위에 결과 · 가운데 네온 배너.
 */
export function YutThrowFx({
  sticks,
  value,
  team,
  at,
  power = 55,
  fast,
  onImpact,
}: {
  sticks: boolean[];
  value: number;
  team: Team;
  at: number;
  power?: number;
  fast: boolean;
  onImpact: () => void;
}) {
  const fly = fast ? 0.6 : 0.9;
  const landMs = fly * 1000 * 0.78;
  const nak = value === 0;
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setLanded(true);
      if (!nak) onImpact();
    }, landMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 던질 때마다 한 번
  }, [at]);
  const layout = useMemo(() => {
    const r = seeded(at);
    return sticks.map((_, i) => ({
      lx: (i - 1.5) * 34 + (r() - 0.5) * 22,
      ly: (r() - 0.5) * 26,
      rot: 720 + Math.round(r() * 360) + (r() < 0.5 ? 90 : -90) + Math.round((r() - 0.5) * 50),
      peak: 120 + power * 1.6 + r() * 40,
    }));
  }, [at, sticks, power]);
  const name = YUT_NAMES[value] ?? "?";
  const color = nak ? "#d6cdee" : TEAM_COLOR[team];
  return (
    <div data-yut-throw-fx className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden rounded-3xl">
      {/* 멍석 */}
      <div className="absolute top-1/2 left-1/2 h-[30%] w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 border-[#5a3d1f] bg-[repeating-linear-gradient(45deg,#8a6a3a_0_6px,#9b7943_6px_12px)] opacity-95 shadow-[0_8px_0_#2a1a0c]" />
      {/* 윷가락 */}
      <div className="absolute top-1/2 left-1/2">
        {sticks.map((up, i) => (
          <span
            key={`${at}-${i}`}
            data-yut-stick={up ? "flat" : "round"}
            className={`${nak ? "yut-fly-nak" : "yut-fly"} ${up ? "yut-stick-flat" : "yut-stick-round"} absolute -mt-11 -ml-2.5 h-[88px] w-5 border-[3px] border-[#2a1708]`}
            style={{
              ["--fly" as string]: `${fly}s`,
              ["--lx" as string]: `${layout[i].lx}px`,
              ["--ly" as string]: `${layout[i].ly}px`,
              ["--rot" as string]: `${layout[i].rot}deg`,
              ["--peak" as string]: `${layout[i].peak}px`,
              animationDelay: `${i * 0.03}s`,
              boxShadow: "inset -3px 0 0 rgba(0,0,0,.25)",
            }}
          >
            {i === 0 ? <span className="absolute top-2 left-1/2 size-1.5 -translate-x-1/2 bg-[#ff5d6c]" /> : null}
            {!up ? (
              <>
                <span className="absolute top-4 left-0.5 h-0.5 w-2 bg-[#5a3a1b]" />
                <span className="absolute top-8 left-0.5 h-0.5 w-2 bg-[#5a3a1b]" />
                <span className="absolute top-12 left-0.5 h-0.5 w-2 bg-[#5a3a1b]" />
              </>
            ) : null}
          </span>
        ))}
      </div>
      {landed && !nak ? (
        <>
          {layout.map((l, i) => (
            <span key={i} className="absolute top-1/2 left-1/2" style={{ transform: `translate(${l.lx}px, ${l.ly + 30}px)` }}>
              <PixelBurst x={0} y={0} seed={at + i * 97} colors={DUST} count={9} spread={38} size={6} up={0.85} />
            </span>
          ))}
          <span data-yut-stick-result className="absolute top-[calc(50%-62px)] left-1/2 -translate-x-1/2 rounded-sm border-2 border-[#0a0614] bg-[#ffe08a] px-2 text-sm font-black text-[#2a1400]">
            {name}
          </span>
        </>
      ) : null}
      {landed ? (
        <b data-yut-throw-name className="yut-banner absolute top-[16%] text-6xl sm:text-7xl" style={{ color }}>
          {name}!{value === 4 || value === 5 ? <span className="mt-1 block text-center text-2xl">한 번 더!</span> : null}
        </b>
      ) : null}
    </div>
  );
}

/** 잡기: 화면이 대각선으로 갈라지며 잡은 요괴가 크게 등장 + 약 올리는 한마디 */
export function YutCatchCutIn({
  hero,
  heroName,
  team,
  victims,
  taunt,
}: {
  hero: Face;
  heroName: string;
  team: Team;
  victims: { face: Face; team: Team; name?: string }[];
  taunt: string;
}) {
  const color = TEAM_COLOR[team];
  if (typeof document === "undefined") return null;
  // 판이 비쳐 보이는 반투명 배경 + 가운데 카드(잡은 요괴 · 대사 · 누운 잡힌 말이 한눈에)
  return createPortal(
    <div data-yut-cutin className="yut-cutin pointer-events-none fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-[#0a0614]/40 px-3">
      {/* 칼선 번쩍 */}
      <span aria-hidden className="yut-slash absolute top-1/2 left-[-10%] h-[6px] w-[120%] -rotate-12" style={{ background: `linear-gradient(90deg, transparent, #fff 40%, ${color} 60%, transparent)` }} />
      <div
        className="yut-cutin-card relative grid w-full max-w-md gap-3 rounded-2xl border-4 border-[#0a0614] p-4 shadow-[6px_6px_0_#0a0614]"
        style={{ background: `linear-gradient(140deg, ${color}e6 0%, #1a0f2eee 70%)` }}
      >
        <div className="flex items-end justify-between gap-3">
          {/* 잡은 요괴: 적당한 크기 + 이름 */}
          <div className="grid min-w-0 justify-items-center gap-1">
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element -- 잡은 요괴(픽셀)
              <img src={yokaiImage(hero.species, hero.stage)} alt="" className="yut-cutin-hero size-24 shrink-0 object-contain drop-shadow-[3px_3px_0_#0a0614] sm:size-28" />
            ) : null}
            <b className="max-w-36 truncate rounded-sm border-2 border-[#0a0614] bg-[#0a0614]/80 px-2 text-sm font-black text-white">{heroName}</b>
          </div>
          <b className="yut-cutin-ko self-center font-sans font-black text-2xl text-[#ffcf4a] [text-shadow:3px_3px_0_#0a0614] sm:text-3xl">잡았다!</b>
          {/* 잡힌 말: 누운 모습 크게 + 닉네임 */}
          <div className={`grid gap-x-2 gap-y-2.5 ${victims.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {victims.slice(0, 4).map((v, i) => (
              <div key={i} className="grid justify-items-center">
                <span className="yut-cutin-down grid" style={{ animationDelay: `${180 + i * 90}ms` }}>
                  <YokaiToken face={v.face} team={v.team} className={victims.length > 2 ? "size-11 sm:size-12" : "size-14 sm:size-16"} />
                </span>
                <b className="-mt-1 max-w-20 truncate rounded-sm border-2 border-[#0a0614] px-1 text-[10px] font-black text-white" style={{ background: TEAM_COLOR[v.team] }}>
                  {v.name || "말"}
                </b>
              </div>
            ))}
          </div>
        </div>
        <p className="yut-cutin-text rounded-md border-[3px] border-[#0a0614] bg-[#fff6dc] px-3 py-2 text-center text-lg font-black text-[#2a1400] shadow-[3px_3px_0_#0a0614] sm:text-xl">
          “{taunt}”
        </p>
        {/* 별 파편 */}
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <span key={k} aria-hidden className="yut-cutin-star absolute text-xl" style={{ left: `${10 + k * 15}%`, top: k % 2 ? "-6%" : "96%", animationDelay: `${120 + k * 70}ms` }}>
            ✦
          </span>
        ))}
      </div>
    </div>,
    document.body,
  );
}
