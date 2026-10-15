"use client";

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
  disabled,
  showNumbers,
}: {
  moves: number[];
  forbidden?: number[];
  line?: number[] | null;
  preview?: number | null;
  previewColor?: 1 | 2;
  onPick?: (p: number) => void;
  disabled?: boolean;
  /** 다시 보기: 수 번호 표시 */
  showNumbers?: boolean;
}) {
  const board = boardFrom(moves);
  const last = moves.length ? moves[moves.length - 1] : -1;
  const win = new Set(line ?? []);
  const order = new Map(moves.map((m, n) => [m, n + 1]));

  return (
    <div
      data-omok-board
      className="omok-frame relative mx-auto w-full max-w-[min(560px,calc(100dvh-260px))] min-w-[280px] rounded-[14px] p-[2.2%]"
    >
      <div
        role="grid"
        aria-label="오목판"
        className={cn(
          "omok-wood relative aspect-square w-full touch-manipulation select-none",
          !disabled && onPick ? "cursor-pointer" : "cursor-default",
        )}
        onPointerUp={(e) => {
          if (disabled || !onPick) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
          const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
          if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
          onPick(y * SIZE + x);
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
