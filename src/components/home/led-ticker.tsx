"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronsUpIcon } from "lucide-react";

/** 소식 하나를 보여 주는 시간 */
const SHOW_MS = 4000;

export type TickerItem = {
  id: string;
  message: string;
  href: string;
};

/**
 * 상단 전광판. 소식이 한 줄씩 아래에서 위로 올라오며 바뀝니다(롤링).
 * 예전처럼 옆으로 계속 흐르면 어지럽다는 의견이 있어, 한 줄 높이만 짧게 움직입니다.
 * 마우스를 올리거나 누르고 있으면 멈춥니다.
 */
/** 칭호 소식(「…」 칭호를 받았습니다)은 금색으로 크게 */
const isHonorNews = (message: string) => /칭호를 받았습니다/.test(message);
const HONOR_CLASS = "font-black text-[#f5d76e] drop-shadow-[0_0_6px_rgba(245,215,110,0.55)] md:text-base";

export function LedTicker({ items }: { items: TickerItem[] }) {
  const source =
    items.length > 0
      ? items
      : [{ id: "empty", message: "POKA 소식 — 글 작성 · 레벨업 · 마크 구매가 여기 나옵니다", href: "/" }];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = source[index % source.length];
  const previous = index > 0 ? source[(index - 1) % source.length] : null;

  useEffect(() => {
    if (paused || source.length <= 1) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((value) => value + 1);
    }, SHOW_MS);
    return () => window.clearInterval(timer);
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
        <span className="live-glow rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">LIVE</span>
      </div>
      <div className="relative h-9 min-w-0 flex-1 overflow-hidden md:h-10">
        {/* 나가는 소식(위로 올라가며 사라짐) */}
        {previous ? (
          <span
            key={`out-${index}`}
            aria-hidden
            className={`led-roll-out absolute inset-0 flex items-center text-[12px] font-medium leading-snug text-[#f4eadf] md:text-sm md:tracking-wide ${isHonorNews(previous.message) ? HONOR_CLASS : ""}`}
          >
            <span className="line-clamp-1">{previous.message}</span>
          </span>
        ) : null}
        {/* 들어오는 소식(아래에서 올라옴) */}
        <Link
          key={`in-${index}`}
          // 칭호 소식은 프로필 카드(반짝이는 마크)로 바로
          href={isHonorNews(current.message) && !current.href.includes("#") ? `${current.href}#profile` : current.href}
          aria-live="polite"
          data-ticker-honor={isHonorNews(current.message) ? "on" : undefined}
          className={`${index > 0 ? "led-roll-in " : ""}absolute inset-0 flex items-center text-[12px] font-medium leading-snug text-[#f4eadf] hover:text-white md:text-sm md:tracking-wide ${isHonorNews(current.message) ? HONOR_CLASS : ""}`}
        >
          <span className="line-clamp-1">{current.message}</span>
        </Link>
      </div>
      {source.length > 1 ? (
        <span className="flex shrink-0 items-center gap-0.5 pr-3 pl-2 text-[11px] tabular-nums text-[#c9a25c]" aria-hidden>
          <ChevronsUpIcon className={paused ? "size-3.5 opacity-40" : "led-roll-hint size-3.5"} />
          {(index % source.length) + 1}/{source.length}
        </span>
      ) : null}
    </div>
  );
}
