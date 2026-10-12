"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** 소식 하나를 보여 주는 시간. 옆으로 흐르지 않고 제자리에서 바뀝니다(어지러움 방지). */
const SHOW_MS = 4000;
/** 바뀔 때 흐려졌다 나타나는 시간 */
const FADE_MS = 250;

export type TickerItem = {
  id: string;
  message: string;
  href: string;
};

/**
 * 상단 전광판. 예전에는 글자가 계속 옆으로 흘러 일부 회원이 어지러움을 호소해서,
 * 소식을 한 번에 하나씩 제자리에서 바꿔 보여 줍니다. 마우스를 올리거나 누르고 있으면 멈춥니다.
 * 기기의 '동작 줄이기'가 켜져 있으면 흐려지는 효과 없이 바뀝니다.
 */
export function LedTicker({ items }: { items: TickerItem[] }) {
  const source =
    items.length > 0
      ? items
      : [{ id: "empty", message: "POKA 소식 — 글 작성 · 레벨업 · 마크 구매가 여기 나옵니다", href: "/" }];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const current = source[index % source.length];

  useEffect(() => {
    if (paused || source.length <= 1) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let swap = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (reduce) {
        setIndex((value) => value + 1);
        return;
      }
      setVisible(false);
      swap = window.setTimeout(() => {
        setIndex((value) => value + 1);
        setVisible(true);
      }, FADE_MS);
    }, SHOW_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(swap);
    };
  }, [paused, source.length]);

  return (
    <div
      className="led-board relative flex w-full items-center overflow-hidden"
      aria-label="POKA 실시간 전광판"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex shrink-0 items-center pr-2 pl-2">
        <span className="live-glow rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">LIVE</span>
      </div>
      <Link
        key={`${current.id}-${index}`}
        href={current.href}
        aria-live="polite"
        className="flex min-h-10 min-w-0 flex-1 items-center text-sm font-medium tracking-wide text-[#f4eadf] hover:text-white"
        style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
      >
        <span className="truncate">{current.message}</span>
      </Link>
      {source.length > 1 ? (
        <span className="shrink-0 pr-3 pl-2 text-[11px] tabular-nums text-[#9a8b74]" aria-hidden>
          {(index % source.length) + 1}/{source.length}
        </span>
      ) : null}
    </div>
  );
}
