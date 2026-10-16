"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { BIG_NODES, END, GOAL_XY, NODE_XY, START, YUT_NAMES, type Team, type YutState } from "@/lib/yut";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";
import { PixelBurst } from "@/components/games/pixel-burst";
import { EmoteArt } from "@/components/games/omok-hud";

/** 지름길로 들어가는 칸(오른쪽 위 꼭짓점 · 왼쪽 위 꼭짓점 · 가운데 방) */
export const SHORTCUT_NODES = ["o5", "o10", "c"];

export const TEAM_NAME: Record<Team, string> = { A: "홍팀", B: "청팀" };
export const TEAM_COLOR: Record<Team, string> = { A: "#ff5d6c", B: "#4aa8ff" };
type Face = { species: YokaiSpecies; stage: number } | null;

/** 팀 말 i번의 주인 = 그 팀 (i % 인원)번째 자리(얼굴 = 그 사람 대표 요괴 · 이름표 = 그 사람 닉네임) */
export function pieceFace(faces: Record<Team, Face[]>, team: Team, i: number): Face {
  const list = faces[team];
  return list.length ? list[i % list.length] : null;
}
export function pieceName(names: Record<Team, string[]>, team: Team, i: number): string {
  const list = names[team];
  return list.length ? list[i % list.length] : "";
}

/**
 * 요괴 말: 동그란 사진 대신 픽셀 요괴가 그대로 서 있음(발밑에 팀 색 그림자 발판).
 * idle = 숨 쉬듯 위아래(대기 중), delay로 말마다 박자를 조금씩 다르게.
 */
export function YokaiToken({ face, team, className, dim, idle = false, delay = 0 }: { face: Face; team: Team; className?: string; dim?: boolean; idle?: boolean; delay?: number }) {
  return (
    <span className={cn("relative grid place-items-end justify-items-center", dim && "opacity-45", className)}>
      {/* 발밑 팀 색 그림자 */}
      <span aria-hidden className="absolute bottom-[-2%] left-1/2 h-[20%] w-[78%] -translate-x-1/2 rounded-[50%] border-2 border-[#0a0614]/70" style={{ background: `${TEAM_COLOR[team]}cc`, boxShadow: `0 0 8px ${TEAM_COLOR[team]}` }} />
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element -- 대표 요괴(픽셀) 말
        <img
          src={yokaiImage(face.species, face.stage)}
          alt=""
          draggable={false}
          className={cn("relative z-10 h-[96%] w-auto max-w-[125%] object-contain object-bottom [image-rendering:pixelated] drop-shadow-[2px_2px_0_#0a0614]", idle && "yut-idle")}
          style={idle ? { animationDelay: `${delay}ms` } : undefined}
        />
      ) : (
        <span className="relative z-10 mb-[20%] text-[60%] font-black" style={{ color: TEAM_COLOR[team] }}>
          {team}
        </span>
      )}
    </span>
  );
}

/** 말 이름표(같은 요괴가 많아서 누구 말인지) */
export function NameTag({ name, team, className }: { name: string; team: Team; className?: string }) {
  if (!name) return null;
  return (
    <span
      data-yut-name
      className={cn("pointer-events-none relative z-20 max-w-[5.5rem] truncate border-2 px-1 text-[9px] leading-[14px] font-black text-white shadow-[2px_2px_0_#0a0614] sm:text-[10px] sm:leading-4", className)}
      style={{ background: "#0a0614e6", borderColor: TEAM_COLOR[team] }}
    >
      {name}
    </span>
  );
}

/** 한 칸씩 밟고 가는 연출: 움직인 말 · 밟을 칸들 */
export type YutAnim = { key: number; team: Team; moved: number[]; path: string[]; stepMs: number };
/** 잡힌 말이 판 밖으로 튕겨 나가는 연출 */
export type YutKnock = { key: number; items: { node: string; face: Face; team: Team; kx: number }[] };
/** 픽셀 파편(잡기 충격 · 업기 합체) */
export type YutBurst = { key: number; node: string; colors: string[]; count?: number };

/** 칸 종류: 출발 · 꼭짓점 · 방 = 황금 발판 */
const isGold = (n: string) => BIG_NODES.includes(n);

/** 윷판(29칸) — 나무 틀 · 멍석 바닥 · 입체 픽셀 발판 · 서 있는 요괴 말 · 목말 탑 · 드롭킥 K.O. */
export function YutBoard({
  state,
  faces,
  names,
  fast,
  movable,
  selected,
  ghosts,
  onPiece,
  onGhost,
  onCancel,
  onTapEmpty,
  portal,
  burst,
  impact,
  stepMs: stepMsProp,
  knock,
  merge,
  kick,
  bubbles = [],
  throwReady = false,
  guide = null,
  startPick = null,
  lite = false,
}: {
  state: YutState;
  faces: Record<Team, Face[]>;
  names: Record<Team, string[]>;
  fast: boolean;
  /** 지금 누를 수 있는 말(내 팀 · 판 위) */
  movable: number[];
  selected: number | null;
  /** 고른 말이 갈 수 있는 칸(윷 결과마다) — 눌러서 그 칸으로 */
  ghosts: { node: string; ri: number; label: string }[];
  onPiece: (i: number) => void;
  onGhost: (ri: number) => void;
  /** 빈 땅 클릭 · 우클릭: 고른 것 취소 */
  onCancel: () => void;
  /** 빈 땅 터치(던지기 차례면 던지기 · 아니면 취소) */
  onTapEmpty?: () => void;
  /** 지름길 진입 포털(꼭짓점 · 방에 도착) */
  portal: { node: string; key: number } | null;
  burst: YutBurst | null;
  /** 착지 · 잡기 순간 판 진동 */
  impact: boolean;
  /** 한 칸 점프 시간(다인전 · 윷/모 연속이면 빠르게) */
  stepMs?: number;
  knock: YutKnock | null;
  /** 업기: 이 칸 탑 꼭대기가 위에서 떨어져 합체 */
  merge: { key: number; node: string } | null;
  /** 잡기: 이 칸에 도착한 요괴가 드롭킥 */
  kick?: { key: number; node: string } | null;
  /** 이모티콘: 보낸 사람(닉네임)의 말 머리 위 · 판에 말이 없으면 판 위쪽 */
  bubbles?: { who: string; e: string; at: number; color: string }[];
  /** 던지기 차례: 가운데 멍석을 누르면 던짐 */
  throwReady?: boolean;
  /** 내 말 옮기기 안내: pick = 말 고르기 · dest = 갈 곳 고르기 */
  guide?: "pick" | "dest" | null;
  /** 출발 전 말(대기 말) 중 고를 수 있는 하나 — 출발 모서리 「새 말」 버튼 */
  startPick?: number | null;
  /** 가벼운 효과(휴대폰이 버거울 때) */
  lite?: boolean;
}) {
  // 한 칸씩 점프: 판 상태의 마지막 이동(event.path)에서 바로 계산 — 새 이동이 온 그 화면부터 첫 칸에 있게
  const ev = state.event;
  const anim: YutAnim | null = ev && ev.path?.length && ev.moved?.length ? { key: ev.at, team: ev.team, moved: ev.moved, path: ev.path, stepMs: stepMsProp ?? (fast ? 170 : 260) } : null;
  const stepMs = anim?.stepMs ?? (fast ? 170 : 260);
  // 처음 화면을 열었을 때 이미 지난 이동은 다시 연출하지 않음(i = -1: 끝)
  const [step, setStep] = useState<{ key: number; i: number }>(() => ({ key: anim?.key ?? 0, i: -1 }));
  const animKey = anim?.key ?? 0;
  const animLen = anim?.path.length ?? 0;
  useEffect(() => {
    if (!animKey || !animLen) return;
    let i = 0;
    setStep({ key: animKey, i });
    const t = window.setInterval(() => {
      i += 1;
      if (i >= animLen) {
        window.clearInterval(t);
        setStep({ key: animKey, i: -1 });
      } else setStep({ key: animKey, i });
    }, stepMs);
    return () => window.clearInterval(t);
  }, [animKey, animLen, stepMs]);
  const walking = !anim ? null : step.key === anim.key ? (step.i < 0 ? null : anim.path[step.i]) : anim.path[0];
  const walkIdx = !anim ? -1 : step.key === anim.key ? step.i : 0;
  const hopping = (team: Team, i: number) => Boolean(walking && anim && anim.team === team && anim.moved.includes(i));
  const merging = (p: { pos: string; top: boolean }) => Boolean(!walking && merge && merge.node === p.pos && p.top);
  const kicking = (p: { pos: string; team: Team }) => Boolean(!walking && kick && kick.node === p.pos && p.team === state.event?.team);

  const xy = (n: string): [number, number] => (n === END ? GOAL_XY : (NODE_XY[n === START ? "o0" : n] ?? [50, 50]));
  const shown = (team: Team, i: number, pos: string) => (walking && anim && anim.team === team && anim.moved.includes(i) ? walking : pos);
  // 같은 칸 말끼리 묶어서 목말 탑으로
  const stacks = new Map<string, { team: Team; i: number }[]>();
  (["A", "B"] as const).forEach((team) =>
    state.pieces[team].forEach((p, i) => {
      const pos = shown(team, i, p.pos);
      if (pos === START || pos === END) return;
      const list = stacks.get(pos) ?? [];
      list.push({ team, i });
      stacks.set(pos, list);
    }),
  );
  const pieces: { team: Team; i: number; pos: string; level: number; top: boolean; count: number }[] = [];
  stacks.forEach((list, pos) => list.forEach((p, level) => pieces.push({ ...p, pos, level, top: level === list.length - 1, count: list.length })));
  const nodes = Object.keys(NODE_XY);
  // 불길(판 테두리): 어느 팀이든 3개 업으면 작은 불 · 4개 이상이면 큰 불
  let maxStack = 0;
  stacks.forEach((list) => {
    if (list.length > maxStack) maxStack = list.length;
  });
  const fireLevel = maxStack >= 4 ? 2 : maxStack >= 3 ? 1 : 0;
  const blaze = fireLevel === 2;
  // 테두리 불꽃 자리(위 · 아래 · 왼쪽 · 오른쪽 가장자리를 따라)
  const frameFlames = (() => {
    if (!fireLevel) return [] as { left: number; top: number; size: number; delay: number }[];
    // 나무 테두리 안쪽(판 밖으로 삐져나가지 않게)
    // 한 변에 3업 4개 · 4업 6개(휴대폰에서 불꽃이 많으면 화면이 끊김)
    const per = fireLevel === 2 ? 6 : 4;
    const E = 1.7;
    const out: { left: number; top: number; size: number; delay: number }[] = [];
    for (let k = 0; k < per; k += 1) {
      const t = 4 + ((k + 0.5) / per) * 92;
      out.push({ left: t, top: E, size: 1, delay: k * 97 });
      out.push({ left: t, top: 100 - E, size: 1, delay: k * 131 + 40 });
      out.push({ left: E, top: t, size: 0.9, delay: k * 113 + 70 });
      out.push({ left: 100 - E, top: t, size: 0.9, delay: k * 89 + 20 });
    }
    return out;
  })();
  // 3개 이상 업힌 말이 잡힘 → 불길 진압(연기 1.6초)
  // 처음 열었을 때 이미 지난 일은 다시 연출하지 않음
  const firstEvAt = useRef(ev?.at ?? 0);
  const douseKey = ev?.type === "capture" && (ev.captured ?? 0) >= 3 && ev.at !== firstEvAt.current ? ev.at : 0;
  const [douse, setDouse] = useState<{ key: number; node: string } | null>(null);
  // 골인: 말이 골인 칸에 닿는 순간(한 칸씩 점프가 끝난 뒤) 골인! + 금빛 파편
  const goalKey = ev?.type === "finish" && ev.at !== firstEvAt.current ? ev.at : 0;
  const [goal, setGoal] = useState<number | null>(null);
  useEffect(() => {
    if (!goalKey) return;
    const wait = (ev?.path?.length ?? 1) * stepMs;
    const on = window.setTimeout(() => setGoal(goalKey), wait);
    const off = window.setTimeout(() => setGoal(null), wait + 1500);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 새 골인에만
  }, [goalKey]);
  useEffect(() => {
    if (!douseKey || !ev) return;
    setDouse({ key: douseKey, node: ev.to });
    const t = window.setTimeout(() => setDouse(null), 1600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 새 잡기에만
  }, [douseKey]);
  // 길: 굵은 나무 홈 + 새끼줄 무늬
  const line = (a: string, b: string) => (
    <g key={`${a}-${b}`}>
      <line x1={NODE_XY[a][0]} y1={NODE_XY[a][1]} x2={NODE_XY[b][0]} y2={NODE_XY[b][1]} stroke="#4a2c14" strokeWidth={2.6} strokeLinecap="round" />
      <line x1={NODE_XY[a][0]} y1={NODE_XY[a][1]} x2={NODE_XY[b][0]} y2={NODE_XY[b][1]} stroke="#c9944c" strokeWidth={1.1} strokeDasharray="1.2 0.8" strokeLinecap="round" />
    </g>
  );
  // 같은 칸 탑은 같은 박자로 숨 쉬게(한 몸처럼)
  const beat = (pos: string) => (pos.charCodeAt(pos.length - 1) * 137) % 900;
  return (
    <div
      data-yut-board
      data-yut-skin="arcade-mat"
      className={cn(
        "yut-wood @container relative mx-auto aspect-square w-full max-w-[min(100%,980px,calc(100dvh-140px))] select-none rounded-[18px] p-[3.2%]",
        impact && "yut-impact",
        fireLevel === 1 && "yut-fire-frame-1",
        blaze && "yut-blaze",
        lite && "yut-lite",
      )}
      style={{ ["--yut-speed" as string]: `${stepMs * 0.9}ms` }}
      onClick={(e) => {
        // 말 · 갈 곳이 아닌 빈 땅을 누르면 취소
        if (!(e.target as HTMLElement).closest("button")) (onTapEmpty ?? onCancel)();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      {/* 불길: 판 테두리를 따라 불꽃(3업 작은 불 · 4업 큰 불) */}
      {fireLevel ? (
        <div data-yut-fire={fireLevel === 2 ? "big" : "small"} aria-hidden className="pointer-events-none absolute inset-0 z-[3]">
          {frameFlames.map((f, k) => (
            <span
              key={k}
              className="yut-flame absolute -translate-x-1/2 -translate-y-1/2 leading-none"
              style={{
                left: `${f.left}%`,
                top: `${f.top}%`,
                fontSize: `calc(${fireLevel === 2 ? "clamp(26px, 7.4cqw, 58px)" : "clamp(22px, 6cqw, 44px)"} * ${f.size})`,
                animationDelay: `${f.delay}ms`,
              }}
            >
              🔥
            </span>
          ))}
        </div>
      ) : null}
      {/* 멍석 바닥 */}
      <div className={cn("yut-mat relative size-full rounded-[10px]", fireLevel === 1 && "yut-mat-heat-1", fireLevel === 2 && "yut-mat-heat-2")}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          {line("o0", "o5")}
          {line("o5", "o10")}
          {line("o10", "o15")}
          {line("o15", "o0")}
          {line("o5", "o15")}
          {line("o10", "o0")}
          {/* 출발 모서리 → 골인 칸 */}
          <line x1={NODE_XY.o0[0]} y1={NODE_XY.o0[1]} x2={GOAL_XY[0]} y2={GOAL_XY[1]} stroke="#4a2c14" strokeWidth={2.6} strokeLinecap="round" />
          <line x1={NODE_XY.o0[0]} y1={NODE_XY.o0[1]} x2={GOAL_XY[0]} y2={GOAL_XY[1]} stroke="#ffcf4a" strokeWidth={1.1} strokeDasharray="1.2 0.8" strokeLinecap="round" />
        </svg>
        {/* 큰 불: 판 전체에 불티가 올라감 */}
        {blaze ? (
          <div data-yut-embers aria-hidden className="pointer-events-none absolute inset-0 z-[4] overflow-hidden rounded-[10px]">
            {Array.from({ length: 14 }, (_, k) => (
              <span key={k} className="yut-ember absolute bottom-0 block size-[1.2%] rounded-full" style={{ left: `${(k * 37) % 100}%`, animationDelay: `${(k * 230) % 1800}ms`, animationDuration: `${1600 + ((k * 170) % 900)}ms` }} />
            ))}
          </div>
        ) : null}

        {/* 발판: 보통 = 나무 발판 · 출발 · 꼭짓점 · 방 = 황금 발판 */}
        {nodes.map((n) => {
          const gold = isGold(n);
          const lit = walking === n;
          return (
            <span
              key={n}
              data-yut-tile={gold ? "gold" : "wood"}
              aria-hidden
              className={cn("absolute -translate-x-1/2 -translate-y-1/2", gold ? "yut-tile-gold size-[10.5%]" : "yut-tile size-[6.6%]", lit && "yut-tile-lit")}
              style={{ left: `${NODE_XY[n][0]}%`, top: `${NODE_XY[n][1]}%` }}
            >
              {n === "o0" ? <b className="absolute inset-x-0 -top-[46%] text-center text-[clamp(8px,2.2cqw,13px)] font-black whitespace-nowrap text-[#ffe08a] [text-shadow:1px_1px_0_#0a0614]">출발</b> : null}
              {n === "c" ? <b className="absolute inset-0 grid place-items-center text-[clamp(8px,2.2cqw,13px)] font-black text-[#5a3a00]">방</b> : null}
            </span>
          );
        })}
        {/* 골인 칸: 출발 모서리 바로 아래 */}
        <span
          data-yut-goal
          aria-hidden
          className="yut-goal absolute grid h-[7%] w-[13%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border-[3px] border-[#0a0614] text-[clamp(8px,2.2cqw,13px)] font-black text-[#2a1400]"
          style={{ left: `${GOAL_XY[0]}%`, top: `${GOAL_XY[1]}%` }}
        >
          GOAL · 골인
        </span>
        {/* 단계 안내: ① 말 고르기 → ② 노란 칸 누르기 */}
        {guide ? (
          <div data-yut-guide={guide} className="pointer-events-none absolute top-[1.5%] left-1/2 z-[55] -translate-x-1/2">
            <p className="yut-guide-pill flex items-center gap-1.5 rounded-full border-[3px] border-[#0a0614] bg-[#ffcf4a] px-3 py-1 text-[clamp(11px,2.6cqw,17px)] font-black whitespace-nowrap text-[#2a1400] shadow-[3px_3px_0_#0a0614]">
              {guide === "pick" ? (
                <>
                  <span className="grid size-[1.5em] place-items-center rounded-full bg-[#0a0614] text-[#ffcf4a]">1</span>
                  반짝이는 내 말{startPick !== null ? " 또는 오른쪽 「🐾 새 말」" : ""}을 누르세요
                </>
              ) : (
                <>
                  <span className="grid size-[1.5em] place-items-center rounded-full bg-[#0a0614] text-[#ffcf4a]">2</span>
                  노란 점선 칸(갈 곳)을 누르세요
                </>
              )}
            </p>
          </div>
        ) : null}
        {/* 골인: 골인! + 금빛 파편 */}
        {goal ? (
          <>
            <b key={`goal-${goal}`} data-yut-goal-pop aria-hidden className="yut-goal-pop pointer-events-none absolute z-[46] -translate-x-1/2 font-sans font-black text-[clamp(14px,5cqw,34px)] text-[#ffcf4a] [text-shadow:3px_3px_0_#0a0614,0_0_14px_#fff]" style={{ left: `${GOAL_XY[0] - 6}%`, top: `${GOAL_XY[1] - 16}%` }}>
              골인!
            </b>
            <PixelBurst key={`goal-bits-${goal}`} x={GOAL_XY[0]} y={GOAL_XY[1]} seed={goal} colors={["#ffcf4a", "#fff6dc", "#ff5d6c", "#6ad7ff"]} count={26} spread={80} size={7} up={0.6} />
          </>
        ) : null}
        {/* 불길 진압: 연기 + 「진압!」 */}
        {douse ? (
          <span key={`douse-${douse.key}`} data-yut-douse aria-hidden className="yut-douse pointer-events-none absolute z-[45] grid -translate-x-1/2 -translate-y-full justify-items-center" style={{ left: `${xy(douse.node)[0]}%`, top: `${xy(douse.node)[1]}%` }}>
            <span className="text-[clamp(20px,7cqw,52px)] leading-none">💨</span>
            <b className="border-2 border-[#0a0614] bg-[#6ad7ff] px-1.5 text-[clamp(9px,2.4cqw,15px)] font-black text-[#04263a] shadow-[2px_2px_0_#0a0614]">불길 진압!</b>
          </span>
        ) : null}
        {SHORTCUT_NODES.map((n) => (
          <span key={`portal-${n}`} aria-hidden className="yut-portal-ring-html pointer-events-none absolute size-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#6ad7ff]/70" style={{ left: `${NODE_XY[n][0]}%`, top: `${NODE_XY[n][1]}%` }} />
        ))}

        {ghosts.map((g) => (
          <button
            key={`${g.node}-${g.ri}`}
            type="button"
            data-yut-ghost={g.node}
            onClick={() => onGhost(g.ri)}
            aria-label={g.node === END ? `${g.label}로 골인` : `${g.label}로 여기 옮기기`}
            className="yut-target absolute z-30 grid size-[16%] -translate-x-1/2 -translate-y-1/2 place-items-center border-[3px] border-dashed border-[#ffcf4a] bg-[#ffcf4a]/35 text-[11px] leading-tight font-black text-[#2a1400] [image-rendering:pixelated]"
            style={{ left: `${xy(g.node)[0]}%`, top: `${xy(g.node)[1]}%` }}
          >
            <span className="text-[#fff6dc] [text-shadow:1px_1px_0_#0a0614]">{g.node === END ? "골인!" : "여기"}</span>
            <span className="bg-[#0a0614] px-1 text-[10px] text-[#ffcf4a]">{g.label}</span>
          </button>
        ))}
        {portal ? (
          <span key={`portal-${portal.key}`} data-yut-portal className="yut-portal pointer-events-none absolute z-20 grid size-[22%] place-items-center" style={{ left: `${xy(portal.node)[0]}%`, top: `${xy(portal.node)[1]}%` }}>
            <span className="absolute inset-0 rounded-full border-4 border-dashed border-[#6ad7ff]" />
            <span className="absolute inset-[18%] rounded-full border-4 border-dotted border-[#b77bff]" />
          </span>
        ) : null}
        {portal ? <PixelBurst key={`portal-bits-${portal.key}`} x={xy(portal.node)[0]} y={xy(portal.node)[1]} seed={portal.key + 5} colors={["#6ad7ff", "#b77bff", "#ffffff"]} count={16} spread={60} size={6} up={0} /> : null}

        {/* 말: 발이 발판 위에 오게(아래쪽 기준) · 업히면 목말 탑 */}
        {pieces.map((p) => {
          const [x, y] = xy(p.pos);
          const can = !walking && p.team === state.turnTeam && movable.some((m) => state.pieces[p.team][m]?.pos === p.pos);
          const isSel = selected !== null && p.team === state.turnTeam && state.pieces[p.team][selected]?.pos === p.pos;
          const hop = hopping(p.team, p.i);
          return (
            <button
              key={`${p.team}${p.i}`}
              type="button"
              data-yut-piece={`${p.team}${p.i}`}
              data-yut-selected={isSel && p.top ? "" : undefined}
              disabled={!can}
              onClick={() => onPiece(p.i)}
              aria-label={`${TEAM_NAME[p.team]} ${pieceName(names, p.team, p.i)} 말${p.count > 1 ? ` (${p.count}개 업힘)` : ""}`}
              className={cn("yut-piece absolute grid h-[15%] w-[13%] -translate-x-1/2 place-items-end justify-items-center", can && "cursor-pointer", isSel || hop ? "z-20" : "z-10")}
              // 발 = 칸 중심 조금 아래 · 위층일수록 앞사람 등에 올라탐(목말)
              style={{ left: `${x + (p.level % 2 ? 1.2 : 0) * (p.level ? 1 : 0)}%`, top: `${y - 12.4 - p.level * 7.2}%`, zIndex: isSel || hop ? 25 : 10 + p.level }}
            >
              {/* 고를 수 있는 말: 발밑이 노랗게 반짝 */}
              {can ? <span aria-hidden className="yut-can-glow absolute bottom-[-6%] left-1/2 h-[26%] w-[92%] -translate-x-1/2 rounded-[50%]" /> : null}
              <span
                key={hop ? `hop-${anim?.key}-${walkIdx}` : merging(p) ? `merge-${merge?.key}` : kicking(p) && p.top ? `kick-${kick?.key}` : isSel ? "sel" : "still"}
                className={cn("grid size-full place-items-end justify-items-center", hop ? "yut-hop" : merging(p) ? "yut-merge" : kicking(p) && p.top ? "yut-kick" : isSel && p.top ? "yut-select-jump" : "")}
                style={{ ["--hop" as string]: `${stepMs}ms` }}
              >
                <YokaiToken face={pieceFace(faces, p.team, p.i)} team={p.team} className="size-full" idle={!hop} delay={beat(p.pos)} />
              </span>
              {/* 점프 중 잔상: 달리는 느낌 */}
              {hop ? (
                <span key={`trail-${anim?.key}-${walkIdx}`} className="yut-afterimage pointer-events-none absolute inset-0 -z-10 scale-90 opacity-0 blur-[1px]" style={{ ["--hop" as string]: `${stepMs}ms` }} aria-hidden>
                  <YokaiToken face={pieceFace(faces, p.team, p.i)} team={p.team} className="size-full" />
                </span>
              ) : null}
              {can && p.top && !isSel && guide === "pick" ? (
                <span data-yut-tap aria-hidden className="yut-select-arrow pointer-events-none absolute -top-[40%] left-1/2 grid -translate-x-1/2 justify-items-center">
                  <b className="border-2 border-[#0a0614] bg-[#6ad7ff] px-1 font-sans font-black text-[clamp(6px,1.4cqw,10px)] leading-[1.6] text-[#04263a] shadow-[2px_2px_0_#0a0614]">누르기</b>
                  <span className="text-[clamp(10px,2.4cqw,16px)] leading-none text-[#6ad7ff] [text-shadow:2px_2px_0_#0a0614]">▼</span>
                </span>
              ) : null}
              {/* 고른 말: 머리 위 고르기! 노란 픽셀 손가락 화살표 */}
              {isSel && p.top ? (
                <span data-yut-select-arrow aria-hidden className="yut-select-arrow pointer-events-none absolute -top-[46%] left-1/2 grid -translate-x-1/2 justify-items-center">
                  <b className="border-2 border-[#0a0614] bg-[#ffcf4a] px-1 font-sans font-black text-[clamp(6px,1.4cqw,10px)] leading-[1.6] text-[#2a1400] shadow-[2px_2px_0_#0a0614]">고르기!</b>
                  <span className="text-[clamp(12px,3cqw,20px)] leading-none text-[#ffcf4a] [text-shadow:2px_2px_0_#0a0614]">▼</span>
                </span>
              ) : null}
              {p.top ? <NameTag name={pieceName(names, p.team, p.i)} team={p.team} className="!absolute -bottom-[32%] left-1/2 -translate-x-1/2" /> : null}
              {p.top && p.count > 1 ? (
                <span data-yut-stack className="absolute -top-[8%] -right-[18%] border-2 border-[#0a0614] bg-[#ffcf4a] px-1 font-sans font-black text-[clamp(7px,1.5cqw,11px)] leading-[1.7] text-[#2a1400] shadow-[2px_2px_0_#0a0614]">
                  ×{p.count}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* 가운데 던지기 멍석: 던지기 차례에만 · 누르면 던짐 */}
        {throwReady ? (
          <span data-yut-throw-mat aria-hidden className="yut-throw-mat pointer-events-none absolute top-1/2 left-1/2 z-[5] h-[30%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" />
        ) : null}

        {/* 이모티콘: 보낸 사람 말 머리 위(판에 없으면 위쪽 가운데) */}
        {bubbles.map((bb) => {
          const own = pieces.filter((p) => p.top && pieceName(names, p.team, p.i) === bb.who);
          const at = own[0];
          const pos = at ? xy(at.pos) : null;
          return (
            <span
              key={`${bb.who}-${bb.at}`}
              data-yut-emote-bubble
              className="spec-pop pointer-events-none absolute z-[60] grid -translate-x-1/2 justify-items-center"
              style={pos ? { left: `${pos[0]}%`, top: `${Math.max(0, pos[1] - 30 - (at?.level ?? 0) * 7.2)}%` } : { left: "50%", top: "4%" }}
            >
              <EmoteArt e={bb.e} className="size-14 drop-shadow-[0_3px_0_#0a0614] sm:size-16" />
              <span className="max-w-24 truncate border-2 border-[#0a0614] px-1.5 text-[10px] font-black text-white shadow-[2px_2px_0_#0a0614]" style={{ background: bb.color }}>
                {bb.who}
              </span>
            </span>
          );
        })}

        {/* 칸마다 착지 먼지 */}
        {walking ? <PixelBurst key={`dust-${anim?.key}-${walkIdx}`} x={xy(walking)[0]} y={xy(walking)[1] + 2} seed={(anim?.key ?? 0) + walkIdx * 31} colors={["#d9b980", "#a9844f", "#6e5232"]} count={8} spread={24} size={5} up={0.9} /> : null}
        {burst ? <PixelBurst key={`burst-${burst.key}`} x={xy(burst.node)[0]} y={xy(burst.node)[1]} seed={burst.key} colors={burst.colors} count={burst.count ?? 18} spread={70} size={8} up={0.2} /> : null}
        {/* 잡힌 요괴: 드롭킥에 맞고 빙글빙글 화면 밖으로 + 잡았다! */}
        {knock?.items.length ? (
          <b key={`ko-${knock.key}`} data-yut-ko className="yut-ko pointer-events-none absolute z-40 font-sans font-black text-[clamp(14px,5cqw,34px)] text-[#ff3b4e] [text-shadow:3px_3px_0_#0a0614,0_0_12px_#ffcf4a]" style={{ left: `${xy(knock.items[0].node)[0]}%`, top: `${xy(knock.items[0].node)[1] - 12}%` }}>
            잡았다!
          </b>
        ) : null}
        {knock
          ? knock.items.map((k, i) => (
              <span
                key={`knock-${knock.key}-${i}`}
                data-yut-knock
                className="yut-knock pointer-events-none absolute z-30 grid h-[15%] w-[13%] place-items-end justify-items-center"
                style={{ left: `${xy(k.node)[0]}%`, top: `${xy(k.node)[1] - 6}%`, ["--kx" as string]: `${k.kx}px`, animationDelay: "160ms" }}
              >
                <YokaiToken face={k.face} team={k.team} className="size-full" />
              </span>
            ))
          : null}
      </div>
    </div>
  );
}

export const yutName = (v: number) => YUT_NAMES[v] ?? "?";
