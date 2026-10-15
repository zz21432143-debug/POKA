"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { BIG_NODES, END, NODE_XY, START, YUT_NAMES, type Team, type YutState } from "@/lib/yut";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";
import { PixelBurst } from "@/components/games/pixel-burst";

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

export function YokaiToken({ face, team, className, dim }: { face: Face; team: Team; className?: string; dim?: boolean }) {
  return (
    <span
      className={cn("relative grid place-items-center rounded-full border-[3px] bg-[#140b24] shadow-[0_3px_0_#0a0614]", dim && "opacity-45", className)}
      style={{ borderColor: TEAM_COLOR[team] }}
    >
      {face ? (
        // eslint-disable-next-line @next/next/no-img-element -- 대표 요괴 말
        <img src={yokaiImage(face.species, face.stage)} alt="" draggable={false} className="size-[88%] object-contain [image-rendering:pixelated]" />
      ) : (
        <span className="text-[60%] font-black" style={{ color: TEAM_COLOR[team] }}>
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
      className={cn("pointer-events-none max-w-[5.5rem] truncate rounded-md border px-1 text-[10px] leading-4 font-black text-white", className)}
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

/** 윷판(29칸) + 말(요괴) · 이름표 · 업기 탑 · 잡기 · 한 칸씩 이동 · 갈 곳 미리보기 */
export function YutBoard({
  state,
  faces,
  names,
  fast,
  movable,
  selected,
  ghost,
  onPiece,
  onGhost,
  burst,
  impact,
  stepMs: stepMsProp,
  knock,
  merge,
}: {
  state: YutState;
  faces: Record<Team, Face[]>;
  names: Record<Team, string[]>;
  fast: boolean;
  /** 지금 누를 수 있는 말(내 팀 · 판 위) */
  movable: number[];
  selected: number | null;
  ghost: string | null;
  onPiece: (i: number) => void;
  onGhost: () => void;
  burst: YutBurst | null;
  /** 착지 · 잡기 순간 판 진동 */
  impact: boolean;
  /** 한 칸 점프 시간(다인전 · 윷/모 연속이면 빠르게) */
  stepMs?: number;
  knock: YutKnock | null;
  /** 업기: 이 칸 탑 꼭대기가 위에서 떨어져 합체 */
  merge: { key: number; node: string } | null;
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

  const xy = (n: string) => NODE_XY[n === START || n === END ? "o0" : n] ?? [50, 50];
  const shown = (team: Team, i: number, pos: string) => (walking && anim && anim.team === team && anim.moved.includes(i) ? walking : pos);
  // 같은 칸 말끼리 묶어서 탑으로
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
  const line = (a: string, b: string) => (
    <line key={`${a}-${b}`} x1={NODE_XY[a][0]} y1={NODE_XY[a][1]} x2={NODE_XY[b][0]} y2={NODE_XY[b][1]} stroke="#5b3f8f" strokeWidth={1.4} strokeLinecap="round" />
  );
  return (
    <div
      data-yut-board
      className={cn("relative mx-auto aspect-square w-full max-w-[min(100%,760px)] select-none rounded-3xl border-4 border-[#3b2766] bg-[radial-gradient(circle_at_50%_45%,#2c1a4a,#140b24_70%)] shadow-[0_6px_0_#0a0614]", impact && "yut-impact")}
      style={{ ["--yut-speed" as string]: `${stepMs * 0.9}ms` }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        {line("o0", "o5")}
        {line("o5", "o10")}
        {line("o10", "o15")}
        {line("o15", "o0")}
        {line("o5", "o15")}
        {line("o10", "o0")}
        {nodes.map((n) => {
          const big = BIG_NODES.includes(n);
          const lit = walking === n;
          return (
            <circle
              key={n}
              cx={NODE_XY[n][0]}
              cy={NODE_XY[n][1]}
              r={big ? 4.6 : 2.9}
              fill={lit ? "#ffcf4a" : big ? "#3b2766" : "#24163f"}
              stroke={n === "o0" ? "#ffcf4a" : big ? "#b77bff" : "#6c55a0"}
              strokeWidth={big ? 1.1 : 0.8}
            />
          );
        })}
        <text x={NODE_XY.o0[0] - 1} y={99} textAnchor="middle" fontSize="3.4" fontWeight={900} fill="#ffcf4a">
          출발 · 골
        </text>
        <text x={50} y={57.8} textAnchor="middle" fontSize="3" fontWeight={900} fill="#b77bff">
          방
        </text>
      </svg>

      {ghost ? (
        <button
          type="button"
          data-yut-ghost
          onClick={onGhost}
          aria-label={ghost === END ? "골인시키기" : "여기로 옮기기"}
          className="yut-target absolute z-30 grid size-[13%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-dashed border-[#ffcf4a] bg-[#ffcf4a]/25 text-[11px] font-black text-[#ffe08a]"
          style={{ left: `${xy(ghost)[0]}%`, top: `${xy(ghost)[1] + (ghost === END ? 9 : 0)}%` }}
        >
          {ghost === END ? "골인!" : "여기"}
        </button>
      ) : null}

      {pieces.map((p) => {
        const [x, y] = xy(p.pos);
        const can = !walking && p.team === state.turnTeam && movable.some((m) => state.pieces[p.team][m]?.pos === p.pos);
        const isSel = selected !== null && p.team === state.turnTeam && state.pieces[p.team][selected]?.pos === p.pos;
        return (
          <button
            key={`${p.team}${p.i}`}
            type="button"
            data-yut-piece={`${p.team}${p.i}`}
            disabled={!can}
            onClick={() => onPiece(p.i)}
            aria-label={`${TEAM_NAME[p.team]} ${pieceName(names, p.team, p.i)} 말${p.count > 1 ? ` (${p.count}개 업힘)` : ""}`}
            className={cn("yut-piece absolute grid size-[12%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full", can && "cursor-pointer", isSel || walking ? "z-20" : "z-10")}
            style={{ left: `${x}%`, top: `${y - p.level * 3.2}%` }}
          >
            <span
              key={hopping(p.team, p.i) ? `hop-${anim?.key}-${walkIdx}` : merging(p) ? `merge-${merge?.key}` : "still"}
              className={cn("grid size-full place-items-center", hopping(p.team, p.i) ? "yut-hop" : merging(p) ? "yut-merge" : "")}
              style={{ ["--hop" as string]: `${stepMs}ms` }}
            >
              <YokaiToken face={pieceFace(faces, p.team, p.i)} team={p.team} className={cn("size-full", can && "yut-target", isSel && "scale-110")} />
            </span>
            {p.top ? <NameTag name={pieceName(names, p.team, p.i)} team={p.team} className="absolute -bottom-3.5 left-1/2 -translate-x-1/2" /> : null}
            {p.top && p.count > 1 ? (
              <span data-yut-stack className="absolute -right-1.5 -top-2 rounded-full border-2 border-[#0a0614] bg-[#ffcf4a] px-1.5 text-[11px] font-black leading-4 text-[#2a1400]">
                ×{p.count}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* 칸마다 착지 먼지 */}
      {walking ? <PixelBurst key={`dust-${anim?.key}-${walkIdx}`} x={xy(walking)[0]} y={xy(walking)[1] + 4} seed={(anim?.key ?? 0) + walkIdx * 31} colors={["#d9b980", "#a9844f", "#6e5232"]} count={7} spread={22} size={5} up={0.9} /> : null}
      {burst ? <PixelBurst key={`burst-${burst.key}`} x={xy(burst.node)[0]} y={xy(burst.node)[1]} seed={burst.key} colors={burst.colors} count={burst.count ?? 18} spread={70} size={8} up={0.2} /> : null}
      {knock
        ? knock.items.map((k, i) => (
            <span
              key={`knock-${knock.key}-${i}`}
              data-yut-knock
              className="yut-knock pointer-events-none absolute z-30 grid size-[11.5%] place-items-center"
              style={{ left: `${xy(k.node)[0]}%`, top: `${xy(k.node)[1]}%`, ["--kx" as string]: `${k.kx}px` }}
            >
              <YokaiToken face={k.face} team={k.team} className="size-full" />
            </span>
          ))
        : null}
    </div>
  );
}

export const yutName = (v: number) => YUT_NAMES[v] ?? "?";
