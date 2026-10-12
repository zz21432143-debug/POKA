import Link from "next/link";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";

/**
 * 글 목록 속 광고(C). 3번째 글 아래에 들어갑니다.
 * 사진이 있으면 사진을 크게(4:3) 보여 주어 홍보물 글씨가 읽히게 하고, 금테로 일반 글과 구분합니다.
 */
export function SponsoredPostLine({ unit }: { unit: DirectCreative | null }) {
  const fill = pickFill(unit, "hide");
  if (fill.kind !== "direct") return null;
  const creative = fill.creative;

  return (
    <li className="board-sponsor list-none px-2 py-2 sm:px-3">
      <Link
        href={creative.href}
        className="group flex items-center gap-3 rounded-xl border border-[#c9a25c]/60 bg-gradient-to-r from-[#3a2a17] to-[#221a12] p-2.5 shadow-[0_0_0_3px_rgb(201_162_92/0.08)] hover:border-[#e7c98a] sm:gap-4 sm:p-3"
      >
        {creative.imageUrl ? (
          <span className="relative w-[42%] max-w-56 shrink-0 overflow-hidden rounded-lg bg-black ring-1 ring-white/15 sm:w-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creative.imageUrl}
              alt={creative.title || creative.advertiser || "광고"}
              width={224}
              height={168}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute top-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-[#e7c98a] ring-1 ring-[#c9a25c]/60">
              {creative.mark}
            </span>
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-[#C59B27] bg-[#1C1819] px-2.5 py-0.5 text-[11px] font-semibold text-[#C59B27]">
            {creative.mark}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="line-clamp-2 text-[17px] font-black leading-snug text-white sm:text-xl">{creative.title}</span>
          <span className="truncate text-xs font-medium text-[#c9b48a] sm:text-sm">
            {creative.advertiser ? `${creative.advertiser} · ` : ""}광고
          </span>
          <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-[#c9a25c] px-3 py-1 text-xs font-bold text-[#1d1611] group-hover:bg-[#e7c98a]">
            자세히 보기 →
          </span>
        </span>
      </Link>
    </li>
  );
}
