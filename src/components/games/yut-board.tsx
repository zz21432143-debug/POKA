"use client";

import { cn } from "cn";
import { BIG_NODES, END, NODE_XY, START, YUT_NAMES, type Team, type YutState } from "@/lib/yut";
import { yokaiImage, type YokaiSpecies } from "@/lib/yokai";

export const TEAM_NAME: Record<Team, string> = { A: "홍팀", B: "청팀" };
export const TEAM_COLOR: Record<Team, string> = { A: "#ff5d6c", B: "#4aa8ff" };
type Face = { species: YokaiSpecies; stage: number } | null;

/** 팀 말 i번의 얼굴 = 그 팀 (i % 인원)번째 자리의 대표 요괴 */
export function pieceFace(faces: Record<Team, Face[]>, team: Team, i: number): Face {
  const list = faces[team];
  return list.length ? list[i % list.length] : null;
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

/** 윷판(29칸) + 말(요괴) · 업기 탑 · 잡기 · 갈 곳 미리보기 */
export function YutBoard({
  state,
  faces,
  fast,
  movable,
  selected,
  ghost,
  onPiece,
  onGhost,
  hit,
  shake,
}: {
  state: YutState;
  faces: Record<Team, Face[]>;
  fast: boolean;
  /** 지금 누를 수 있는 말(내 팀 · 판 위) */
  movable: number[];
  selected: number | null;
  ghost: string | null;
  onPiece: (i: number) => void;
  onGhost: () => void;
  hit: { node: string; key: number } | null;
  shake: boolean;
}) {
  const xy = (n: string) => NODE_XY[n === START || n === END ? "o0" : n] ?? [50, 50];
  // 같은 칸 말끼리 묶어서 탑으로
  const stacks = new Map<string, { team: Team; i: number }[]>();
  (["A", "B"] as const).forEach((team) =>
    state.pieces[team].forEach((p, i) => {
      if (p.pos === START || p.pos === END) return;
      const list = stacks.get(p.pos) ?? [];
      list.push({ team, i });
      stacks.set(p.pos, list);
    }),
  );
  const pieces: { team: Team; i: number; pos: string; level: number; top: boolean; count: number }[] = [];
  stacks.forEach((list, pos) => list.forEach((p, level) => pieces.push({ ...p, pos, level, top: level === list.length - 1, count: list.length })));
  const myTeamOf = (team: Team) => team === state.turnTeam;
  const nodes = Object.keys(NODE_XY);
  const line = (a: string, b: string) => (
    <line key={`${a}-${b}`} x1={NODE_XY[a][0]} y1={NODE_XY[a][1]} x2={NODE_XY[b][0]} y2={NODE_XY[b][1]} stroke="#5b3f8f" strokeWidth={1.4} strokeLinecap="round" />
  );
  return (
    <div
      data-yut-board
      className={cn("relative mx-auto aspect-square w-full max-w-[min(92vw,560px)] select-none rounded-3xl border-4 border-[#3b2766] bg-[radial-gradient(circle_at_50%_45%,#2c1a4a,#140b24_70%)] shadow-[0_6px_0_#0a0614]", shake && "yut-shake")}
      style={{ ["--yut-speed" as string]: fast ? "0.2s" : "0.38s" }}
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
          return (
            <circle
              key={n}
              cx={NODE_XY[n][0]}
              cy={NODE_XY[n][1]}
              r={big ? 4.6 : 2.9}
              fill={big ? "#3b2766" : "#24163f"}
              stroke={n === "o0" ? "#ffcf4a" : big ? "#b77bff" : "#6c55a0"}
              strokeWidth={big ? 1.1 : 0.8}
            />
          );
        })}
        <text x={NODE_XY.o0[0] - 1} y={NODE_XY.o0[1] - 7.2} textAnchor="middle" fontSize="3.6" fontWeight={900} fill="#ffcf4a">
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
        const can = p.team === state.turnTeam && movable.some((m) => state.pieces[p.team][m]?.pos === p.pos);
        const isSel = selected !== null && p.team === state.turnTeam && state.pieces[p.team][selected]?.pos === p.pos;
        return (
          <button
            key={`${p.team}${p.i}`}
            type="button"
            data-yut-piece={`${p.team}${p.i}`}
            disabled={!can}
            onClick={() => onPiece(p.i)}
            aria-label={`${TEAM_NAME[p.team]} 말${p.count > 1 ? ` (${p.count}개 업힘)` : ""}`}
            className={cn("yut-piece absolute grid size-[11.5%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full", can && "cursor-pointer", isSel ? "z-20" : "z-10")}
            style={{ left: `${x}%`, top: `${y - p.level * 3.2}%` }}
          >
            <YokaiToken face={pieceFace(faces, p.team, p.i)} team={p.team} className={cn("size-full", can && myTeamOf(p.team) && "yut-target", isSel && "scale-110")} />
            {p.top && p.count > 1 ? (
              <span data-yut-stack className="absolute -right-1.5 -top-2 rounded-full border-2 border-[#0a0614] bg-[#ffcf4a] px-1.5 text-[11px] font-black leading-4 text-[#2a1400]">
                ×{p.count}
              </span>
            ) : null}
          </button>
        );
      })}

      {hit ? (
        <span key={hit.key} data-yut-hit className="yut-hit pointer-events-none absolute z-40 grid size-[24%] place-items-center" style={{ left: `${xy(hit.node)[0]}%`, top: `${xy(hit.node)[1]}%` }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
            <polygon points="50,2 60,35 98,30 68,55 85,95 50,70 15,95 32,55 2,30 40,35" fill="#ffcf4a" stroke="#ff5d6c" strokeWidth="4" />
          </svg>
          <b className="relative text-lg font-black text-[#2a1400]">퍽!</b>
        </span>
      ) : null}
    </div>
  );
}

/** 던진 윷가락 4개(앞면 = 배 · 뒷면 = 등) */
export function YutSticks({ sticks, k, fast }: { sticks: boolean[]; k: number; fast: boolean }) {
  return (
    <div className="flex items-end justify-center gap-2" style={{ ["--yut-throw" as string]: fast ? "0.4s" : "0.7s" }}>
      {sticks.map((up, i) => (
        <span
          key={`${k}-${i}`}
          className={cn("yut-stick relative h-16 w-4 rounded-full border-2 border-[#0a0614]", up ? "bg-[#f3dfb5]" : "bg-[#8a5a2b]")}
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          {/* 빽도 표시 막대 */}
          {i === 0 ? <span className="absolute left-1/2 top-2 size-1.5 -translate-x-1/2 rounded-full bg-[#ff5d6c]" /> : null}
          {!up ? <span className="absolute inset-x-1 top-3 bottom-3 rounded-full border-x-2 border-[#5a3a1b]" /> : null}
        </span>
      ))}
    </div>
  );
}

export const yutName = (v: number) => YUT_NAMES[v] ?? "?";
