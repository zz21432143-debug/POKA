"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";

/**
 * 홈 대문 롤링: 여러 장을 같은 자리에 겹쳐 두고 장마다 정한 시간(기본 6초) 뒤 다음 장(마우스를 올리면 멈춤).
 * 점을 누르거나 옆으로 밀어서 넘길 수 있음. 높이는 가장 큰 장에 맞춤(흔들림 없음).
 */
export function HeroCarousel({ slides }: { slides: { key: string; label: string; node: ReactNode; ms?: number }[] }) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const n = slides.length;
  const stay = slides[i]?.ms ?? 6000;
  useEffect(() => {
    if (pause || n < 2) return;
    const t = window.setTimeout(() => setI((v) => (v + 1) % n), stay);
    return () => window.clearTimeout(t);
  }, [pause, n, i, stay]);
  return (
    <div
      data-hero-carousel
      className="relative"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onPointerDown={(e) => {
        startX.current = e.clientX;
        swiped.current = false;
      }}
      onClickCapture={(e) => {
        // 옆으로 민 손가락이 그림 링크를 누른 걸로 치지 않게
        if (swiped.current) {
          e.preventDefault();
          e.stopPropagation();
          swiped.current = false;
        }
      }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 50) {
          swiped.current = true;
          setI((v) => (v + (dx < 0 ? 1 : -1) + n) % n);
        }
      }}
    >
      <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
        {slides.map((s, k) => (
          <div
            key={s.key}
            data-hero-slide={s.key}
            aria-hidden={k !== i}
            inert={k !== i}
            className={cn("h-full transition-opacity duration-700", k === i ? "opacity-100" : "pointer-events-none opacity-0")}
          >
            {s.node}
          </div>
        ))}
      </div>
      {n > 1 ? (
        <div className="absolute right-3 bottom-2 z-10 flex gap-1.5">
          {slides.map((s, k) => (
            <button
              key={s.key}
              type="button"
              aria-label={`${s.label} 보기`}
              aria-current={k === i}
              onClick={() => setI(k)}
              className="grid size-6 place-items-center"
            >
              <span className={cn("block h-2 rounded-full transition-all", k === i ? "w-5 bg-[#ffcf4a]" : "w-2 bg-white/50")} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
