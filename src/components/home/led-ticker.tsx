"use client";

import Link from "next/link";

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
  const seconds = Math.max(45, Math.round(halfWidth / 38));

  return (
    <div className="led-board relative w-full overflow-hidden" aria-label="POKA 실시간 전광판">
      <div className="live-glow pointer-events-none absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
        LIVE
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
