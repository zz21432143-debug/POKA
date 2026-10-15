"use client";

import { useMemo } from "react";

/** 같은 판이면 모두에게 같은 모양(던진 시각을 씨앗으로) */
export function seeded(seed: number) {
  let a = Math.floor(seed) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 픽셀 파편(네모 조각이 계단식으로 흩어짐) — 별 · 반짝이 없이 묵직하게 */
export function PixelBurst({
  x,
  y,
  seed,
  colors,
  count = 14,
  spread = 46,
  size = 6,
  up = 0.7,
}: {
  x: number;
  y: number;
  seed: number;
  colors: string[];
  count?: number;
  spread?: number;
  size?: number;
  /** 위로 튀는 정도(0 = 사방 · 1 = 위쪽만) */
  up?: number;
}) {
  const bits = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: count }, (_, i) => {
      const ang = Math.PI * (1 + up) + (r() - 0.5) * Math.PI * (2 - up * 1.4);
      const dist = spread * (0.45 + r() * 0.75);
      return {
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist * 0.8,
        c: colors[i % colors.length],
        s: size * (0.6 + r() * 0.9),
        d: 0.45 + r() * 0.35,
      };
    });
  }, [seed, count, spread, size, up, colors]);
  return (
    <span className="pointer-events-none absolute z-40" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="yut-dust absolute"
          style={{
            width: b.s,
            height: b.s,
            marginLeft: -b.s / 2,
            marginTop: -b.s / 2,
            background: b.c,
            boxShadow: "1px 1px 0 #0a0614",
            ["--dx" as string]: `${b.dx}px`,
            ["--dy" as string]: `${b.dy}px`,
            ["--dur" as string]: `${b.d}s`,
          }}
        />
      ))}
    </span>
  );
}

