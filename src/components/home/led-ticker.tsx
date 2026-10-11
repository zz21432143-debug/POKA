"use client";

import Link from "next/link";

/** 전광판 속도. 숫자를 키우면 더 빨라집니다. */
const TICKER_PX_PER_SECOND = 80;

export type TickerItem = {
  id: string;
  message: string;
  href: string;
};

export function LedTicker({ items }: { items: TickerItem[] }) {
  const source =
    items.length > 0
      ? items
      : [{ id: "empty", message: "POKA 소식 — 글 작성 · 레벨업 · 마크 구매가 여기 흐릅니다", href: "/" }];
  const copies = source.length < 4 ? 4 : 2;
  const loop = Array.from({ length: copies }, () => source).flat();
  const halfWidth = (loop.reduce((sum, item) => sum + item.message.length * 14 + 48, 0)) / 2;
  // 초당 약 80px로 흐릅니다(예전 38px). 소식이 적어도 한 바퀴 최소 20초.
  const seconds = Math.max(20, Math.round(halfWidth / TICKER_PX_PER_SECOND));

  return (
    <div className="led-board relative w-full overflow-hidden" aria-label="POKA 실시간 전광판">
      {/* LIVE 뒤로 글자가 비치지 않도록 왼쪽 칸을 배경색으로 덮습니다. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-[#0f0b08] pr-1.5 pl-2 shadow-[6px_0_8px_#0f0b08]">
        <span className="live-glow rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">LIVE</span>
      </div>
      <div className="led-marquee flex w-max items-center gap-12 pl-16" style={{ animationDuration: `${seconds}s` }}>
        {loop.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={item.href}
            className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap text-sm font-medium tracking-wide text-[#f4eadf] hover:text-white"
          >
            {item.message}
          </Link>
        ))}
      </div>
    </div>
  );
}
