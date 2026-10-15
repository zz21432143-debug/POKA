"use client";

import { useState } from "react";
import { cn } from "cn";
import { SIZE, STAR_POINTS, boardFrom, xyOf } from "@/lib/omok";

const CELL = 100 / SIZE;
const pos = (i: number) => {
  const { x, y } = xyOf(i);
  return { left: `${(x + 0.5) * CELL}%`, top: `${(y + 0.5) * CELL}%` };
};

/**
 * 오목판(15×15): 나무판 + 옻칠 테두리 · 흑옥/백옥 돌 · 마지막 수 금빛 · 5목 줄 빛남 · 흑 금수 ❌ · 미리보기 돌.
 * 칸 고르기는 판 전체 한 곳에서(손가락 위치 → 가장 가까운 교차점).
 */
export function OmokBoard({
  moves,
  forbidden = [],
  line,
  preview,
  previewColor,
  onPick,
  onTouchPlace,
  disabled,
  showNumbers,
}: {
  moves: number[];
  forbidden?: number[];
  line?: number[] | null;
  preview?: number | null;
  previewColor?: 1 | 2;
  onPick?: (p: number) => void;
  /** 휴대폰: 누른 채 돋보기로 맞추고 손을 떼면 바로 착수(없으면 onPick) */
  onTouchPlace?: (p: number) => void;
  disabled?: boolean;
  /** 다시 보기: 수 번호 표시 */
  showNumbers?: boolean;
}) {
  const board = boardFrom(moves);
  const last = moves.length ? moves[moves.length - 1] : -1;
  const win = new Set(line ?? []);
  const order = new Map(moves.map((m, n) => [m, n + 1]));
  // 손가락 돋보기: 누르고 있는 동안 손가락 위쪽에 확대 칸 · 떼면 착수 · 판 밖으로 빼면 취소
  const [touch, setTouch] = useState<{ p: number; x: number; y: number } | null>(null);
  const cellAt = (el: HTMLElement, cx: number, cy: number) => {
    const rect = el.getBoundingClientRect();
    const x = Math.floor(((cx - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((cy - rect.top) / rect.height) * SIZE);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return { p: y * SIZE + x, x: cx - rect.left, y: cy - rect.top };
  };
  const loupe = onTouchPlace && !disabled;

  return (
    <div
      data-omok-board
      className="omok-frame relative mx-auto w-full max-w-[min(760px,calc(100dvh-200px))] min-w-[280px] rounded-[14px] p-[2.2%]"
    >
      <div
        role="grid"
        aria-label="오목판"
        className={cn(
          "omok-wood relative aspect-square w-full select-none",
          loupe ? "touch-none" : "touch-manipulation",
          !disabled && onPick ? "cursor-pointer" : "cursor-default",
        )}
        onPointerDown={(e) => {
          if (!loupe || e.pointerType === "mouse") return;
          setTouch(cellAt(e.currentTarget, e.clientX, e.clientY));
        }}
        onPointerMove={(e) => {
          if (!touch) return;
          setTouch(cellAt(e.currentTarget, e.clientX, e.clientY));
        }}
        onPointerCancel={() => setTouch(null)}
        onPointerUp={(e) => {
          if (disabled || !onPick) return;
          const hit = cellAt(e.currentTarget, e.clientX, e.clientY);
          if (touch) {
            setTouch(null);
            if (hit && onTouchPlace) onTouchPlace(hit.p);
            return;
          }
          if (hit) onPick(hit.p);
        }}
      >
        {/* 줄 · 화점 */}
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
        >
          {Array.from({ length: SIZE }, (_, i) => (
            <g
              key={i}
              stroke="#3b2510"
              strokeWidth={i === 0 || i === SIZE - 1 ? 0.06 : 0.035}
            >
              <line x1={0.5} y1={i + 0.5} x2={SIZE - 0.5} y2={i + 0.5} />
              <line x1={i + 0.5} y1={0.5} x2={i + 0.5} y2={SIZE - 0.5} />
            </g>
          ))}
          {STAR_POINTS.map((p) => {
            const { x, y } = xyOf(p);
            return (
              <circle
                key={p}
                cx={x + 0.5}
                cy={y + 0.5}
                r={0.12}
                fill="#3b2510"
              />
            );
          })}
        </svg>

        {/* 흑 금수(삼삼) */}
        {forbidden.map((p) => (
          <span
            key={`f${p}`}
            data-omok-forbidden
            aria-hidden
            className="omok-forbid pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{
              ...pos(p),
              width: `${CELL * 0.62}%`,
              height: `${CELL * 0.62}%`,
            }}
          >
            ✕
          </span>
        ))}

        {/* 돌 */}
        {board.map((c, i) =>
          c ? (
            <span
              key={i}
              data-omok-stone={c === 1 ? "b" : "w"}
              className={cn(
                "omok-stone pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                c === 1 ? "omok-black" : "omok-white",
                i === last && "omok-drop",
                win.has(i) && "omok-win",
              )}
              style={{
                ...pos(i),
                width: `${CELL * 0.92}%`,
                height: `${CELL * 0.92}%`,
              }}
            >
              {showNumbers ? (
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center text-[min(2.2vw,11px)] font-black tabular-nums",
                    c === 1 ? "text-white" : "text-black",
                  )}
                >
                  {order.get(i)}
                </span>
              ) : i === last ? (
                <span
                  data-omok-last
                  className="absolute top-1/2 left-1/2 size-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#f5c451] shadow-[0_0_6px_#f5c451]"
                />
              ) : null}
            </span>
          ) : null,
        )}

        {/* 손가락 돋보기: 손가락에 가려진 자리를 위쪽에 크게 */}
        {touch ? (
          <>
            <span
              aria-hidden
              className="omok-stone pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 ring-2 ring-[#ffcf4a]"
              style={{ ...pos(touch.p), width: `${CELL * 0.92}%`, height: `${CELL * 0.92}%` }}
            />
            <Loupe board={board} p={touch.p} color={previewColor ?? 1} forbidden={forbidden.includes(touch.p)} left={touch.x} top={touch.y} />
          </>
        ) : null}

        {/* 미리보기(한 번 더 누르면 둠) */}
        {preview !== null && preview !== undefined && board[preview] === 0 ? (
          <span
            data-omok-preview
            className={cn(
              "omok-stone pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full opacity-60",
              previewColor === 2 ? "omok-white" : "omok-black",
            )}
            style={{
              ...pos(preview),
              width: `${CELL * 0.92}%`,
              height: `${CELL * 0.92}%`,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** 돋보기: 고른 칸 둘레 5×5를 크게(손가락 위 약 100px) */
function Loupe({ board, p, color, forbidden, left, top }: { board: number[]; p: number; color: 1 | 2; forbidden: boolean; left: number; top: number }) {
  const { x: cx, y: cy } = xyOf(p);
  const R = 2;
  const cells: { dx: number; dy: number; c: number; inside: boolean }[] = [];
  for (let dy = -R; dy <= R; dy += 1)
    for (let dx = -R; dx <= R; dx += 1) {
      const x = cx + dx;
      const y = cy + dy;
      const inside = x >= 0 && y >= 0 && x < SIZE && y < SIZE;
      cells.push({ dx, dy, c: inside ? board[y * SIZE + x] : 0, inside });
    }
  const n = R * 2 + 1;
  return (
    <span
      data-omok-loupe
      aria-hidden
      className="pointer-events-none absolute z-30 grid size-28 -translate-x-1/2 place-items-center overflow-hidden rounded-full border-4 border-[#ffcf4a] bg-[#d9a85c] shadow-[0_6px_0_#0a0614,0_0_18px_#000]"
      style={{ left, top: Math.max(-40, top - 150) }}
    >
      <svg viewBox={`0 0 ${n} ${n}`} className="size-full">
        {cells.map((k) =>
          k.inside ? (
            <g key={`${k.dx},${k.dy}`} stroke="#3b2510" strokeWidth={0.05}>
              <line x1={k.dx + R} y1={k.dy + R + 0.5} x2={k.dx + R + 1} y2={k.dy + R + 0.5} />
              <line x1={k.dx + R + 0.5} y1={k.dy + R} x2={k.dx + R + 0.5} y2={k.dy + R + 1} />
            </g>
          ) : null,
        )}
        {cells.map((k) =>
          k.c ? <circle key={`s${k.dx},${k.dy}`} cx={k.dx + R + 0.5} cy={k.dy + R + 0.5} r={0.44} fill={k.c === 1 ? "#141414" : "#f4f1ea"} stroke="#0a0614" strokeWidth={0.04} /> : null,
        )}
        {board[p] === 0 ? (
          <circle cx={R + 0.5} cy={R + 0.5} r={0.44} fill={color === 1 ? "#141414" : "#f4f1ea"} opacity={0.75} stroke="#ffcf4a" strokeWidth={0.08} />
        ) : null}
        {forbidden || board[p] !== 0 ? (
          <text x={R + 0.5} y={R + 0.82} textAnchor="middle" fontSize={0.9} fontWeight={900} fill="#ff3b4e">
            ✕
          </text>
        ) : null}
      </svg>
    </span>
  );
}

/** 작은 돌 아이콘(흑/백 표시) */
export function StoneDot({
  color,
  className,
}: {
  color: 1 | 2;
  className?: string;
}) {
  return (
    <span
      aria-label={color === 1 ? "흑" : "백"}
      className={cn(
        "omok-stone inline-block size-4 shrink-0 rounded-full",
        color === 1 ? "omok-black" : "omok-white",
        className,
      )}
    />
  );
}
