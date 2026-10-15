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
  victims: { face: Face; team: Team }[];
  taunt: string;
}) {
  const color = TEAM_COLOR[team];
  if (typeof document === "undefined") return null;
  return createPortal(
    <div data-yut-cutin className="yut-cutin pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      <div className="yut-cutin-a absolute inset-0" style={{ background: `linear-gradient(120deg, ${color} 0%, #1a0f2e 75%)` }}>
        <div className="absolute inset-0 bg-[repeating-linear-gradient(-30deg,transparent_0_18px,rgba(0,0,0,.18)_18px_22px)]" />
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- 잡은 요괴(큰 픽셀 그림)
          <img src={yokaiImage(hero.species, hero.stage)} alt="" className="yut-cutin-hero absolute top-[2%] left-[2%] h-[62%] w-auto max-w-[70%] object-contain drop-shadow-[6px_6px_0_#0a0614]" />
        ) : null}
        <b className="absolute top-[8%] right-[5%] max-w-[45%] truncate rounded-sm border-2 border-[#0a0614] bg-[#0a0614]/70 px-2 py-1 text-lg font-black text-white">{heroName}</b>
      </div>
      <div className="yut-cutin-b absolute inset-0 bg-[#0a0614]/92">
        <div className="absolute right-[6%] bottom-[30%] flex gap-2">
          {victims.slice(0, 3).map((v, i) => (
            <span key={i} className="grid rotate-12 grayscale">
              <YokaiToken face={v.face} team={v.team} className="size-16 opacity-80" />
            </span>
          ))}
          <b className="self-center text-2xl font-black text-[#ff5d6c] [text-shadow:2px_2px_0_#0a0614]">K.O.</b>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-[9%] grid justify-items-center">
        <p className="yut-cutin-text max-w-xl rounded-md border-4 border-[#0a0614] bg-[#fff6dc] px-4 py-3 text-center text-2xl font-black text-[#2a1400] shadow-[6px_6px_0_#0a0614] sm:text-3xl">
          “{taunt}”
        </p>
      </div>
    </div>,
    document.body,
  );
}
