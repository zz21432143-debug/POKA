"use client";

import Link from "next/link";

export type TickerItem = {
  id: string;
  message: string;
  href: string;
};

export function LedTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) {
    return (
      <div className="led-board w-full overflow-hidden px-3 py-2.5 text-sm text-[#ffe566]">
        POKA 전광판 — 출석·레벨·인기글 소식이 여기 흐릅니다.
      </div>
    );
  }

  const loop = [...items, ...items];
  return (
    <div className="led-board relative w-full overflow-hidden" aria-label="POKA 실시간 전광판">
      <div className="led-marquee flex w-max gap-10 py-2.5 pl-4">
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
