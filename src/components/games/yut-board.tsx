"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { BIG_NODES, END, NODE_XY, START, YUT_NAMES, type Team, type YutState } from "@/lib/yut";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";
import { PixelBurst } from "@/components/games/pixel-burst";

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
      className={cn("pointer-events-none max-w-[5.5rem] truncate border-2 px-1 text-[10px] leading-4 font-black text-white shadow-[2px_2px_0_#0a0614]", className)}
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
  portal,
  burst,
  impact,
  stepMs: stepMsProp,
  knock,
  merge,
  kick,
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

  const xy = (n: string) => NODE_XY[n === START || n === END ? "o0" : n] ?? [50, 50];
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
        "yut-wood relative mx-auto aspect-square w-full max-w-[min(100%,760px,calc(100dvh-170px))] select-none rounded-[18px] p-[3.2%]",
        impact && "yut-impact",
      )}
      style={{ ["--yut-speed" as string]: `${stepMs * 0.9}ms` }}
      onClick={(e) => {
        // 말 · 갈 곳이 아닌 빈 땅을 누르면 취소
        if (!(e.target as HTMLElement).closest("button")) onCancel();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      {/* 멍석 바닥 */}
      <div className="yut-mat relative size-full rounded-[10px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          {line("o0", "o5")}
          {line("o5", "o10")}
          {line("o10", "o15")}
          {line("o15", "o0")}
          {line("o5", "o15")}
          {line("o10", "o0")}
        </svg>

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
              {n === "o0" ? <b className="absolute inset-x-0 -bottom-[46%] text-center text-[clamp(8px,2.2cqw,13px)] font-black whitespace-nowrap text-[#ffe08a] [text-shadow:1px_1px_0_#0a0614]">출발 · 골</b> : null}
              {n === "c" ? <b className="absolute inset-0 grid place-items-center text-[clamp(8px,2.2cqw,13px)] font-black text-[#5a3a00]">방</b> : null}
            </span>
          );
        })}
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
            className="yut-target absolute z-30 grid size-[13%] -translate-x-1/2 -translate-y-1/2 place-items-center border-[3px] border-dashed border-[#ffcf4a] bg-[#ffcf4a]/35 text-[11px] leading-tight font-black text-[#2a1400] [image-rendering:pixelated]"
            style={{ left: `${xy(g.node)[0]}%`, top: `${xy(g.node)[1] + (g.node === END ? 9 : 0)}%` }}
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
              {/* 고른 말: 머리 위 SELECT! 노란 픽셀 손가락 화살표 */}
              {isSel && p.top ? (
                <span data-yut-select-arrow aria-hidden className="yut-select-arrow pointer-events-none absolute -top-[46%] left-1/2 grid -translate-x-1/2 justify-items-center">
                  <b className="border-2 border-[#0a0614] bg-[#ffcf4a] px-1 font-[family-name:var(--font-arcade)] text-[clamp(6px,1.4cqw,10px)] leading-[1.6] text-[#2a1400] shadow-[2px_2px_0_#0a0614]">SELECT!</b>
                  <span className="text-[clamp(12px,3cqw,20px)] leading-none text-[#ffcf4a] [text-shadow:2px_2px_0_#0a0614]">▼</span>
                </span>
              ) : null}
              {p.top ? <NameTag name={pieceName(names, p.team, p.i)} team={p.team} className="absolute -bottom-[26%] left-1/2 -translate-x-1/2" /> : null}
              {p.top && p.count > 1 ? (
                <span data-yut-stack className="absolute -top-[8%] -right-[18%] border-2 border-[#0a0614] bg-[#ffcf4a] px-1 font-[family-name:var(--font-arcade)] text-[clamp(7px,1.5cqw,11px)] leading-[1.7] text-[#2a1400] shadow-[2px_2px_0_#0a0614]">
                  ×{p.count}
                </span>
              ) : null}
            </button>
          );
        })}

        {/* 칸마다 착지 먼지 */}
        {walking ? <PixelBurst key={`dust-${anim?.key}-${walkIdx}`} x={xy(walking)[0]} y={xy(walking)[1] + 2} seed={(anim?.key ?? 0) + walkIdx * 31} colors={["#d9b980", "#a9844f", "#6e5232"]} count={8} spread={24} size={5} up={0.9} /> : null}
        {burst ? <PixelBurst key={`burst-${burst.key}`} x={xy(burst.node)[0]} y={xy(burst.node)[1]} seed={burst.key} colors={burst.colors} count={burst.count ?? 18} spread={70} size={8} up={0.2} /> : null}
        {/* 잡힌 요괴: 드롭킥에 맞고 빙글빙글 화면 밖으로 + K.O.! */}
        {knock?.items.length ? (
          <b key={`ko-${knock.key}`} data-yut-ko className="yut-ko pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--font-arcade)] text-[clamp(14px,5cqw,34px)] text-[#ff3b4e] [text-shadow:3px_3px_0_#0a0614,0_0_12px_#ffcf4a]" style={{ left: `${xy(knock.items[0].node)[0]}%`, top: `${xy(knock.items[0].node)[1] - 12}%` }}>
            K.O.!
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
