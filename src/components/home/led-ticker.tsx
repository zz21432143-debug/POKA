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
      : [{ id: "empty", message: "POKA 전광판 — 글 작성 · 레벨업 · 마크 구매 소식이 여기 흐릅니다", href: "/" }];
  const copies = source.length < 4 ? 4 : 2;
  const loop = Array.from({ length: copies }, () => source).flat();

  return (
    <div className="led-board relative w-full overflow-hidden" aria-label="POKA 실시간 전광판">
      <div className="pointer-events-none absolute top-0 left-0 z-10 px-2 py-1.5 text-[10px] font-bold tracking-[0.2em] text-[#e8c36a]">
        LIVE
      </div>
      <div className="led-marquee flex w-max gap-12 py-2 pl-14">
        {loop.map((item, index) => (
          <Link
            key={`${item.id}-${index}`}
            href={item.href}
            className="shrink-0 whitespace-nowrap text-sm font-semibold tracking-wide text-[#ffe566] hover:text-white"
          >
            {item.message}
          </Link>
        ))}
      </div>
    </div>
  );
}
