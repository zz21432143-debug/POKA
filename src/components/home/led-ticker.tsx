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

  return (
    <div className="led-board relative w-full overflow-hidden" aria-label="POKA 실시간 전광판">
      <div className="live-glow pointer-events-none absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
        LIVE
      </div>
      <div className="led-marquee flex w-max gap-12 py-1.5 pl-16">
        {loop.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={item.href}
            className="shrink-0 whitespace-nowrap text-sm font-medium tracking-wide text-[#D4AF37] hover:text-[#f3e2a4]"
          >
            {item.message}
          </Link>
        ))}
      </div>
    </div>
  );
}
