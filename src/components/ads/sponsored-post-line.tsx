import Link from "next/link";
import { pickFill, type DirectCreative } from "@/lib/inventory-policy";
import { adsenseSlotId } from "@/lib/adsense";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { sizedImage } from "@/lib/image-url";

/**
 * 글 목록 속 광고(C). 3번째 글 아래에 들어갑니다.
 * 사진이 있으면 목록 너비 가득 가로 배너(3:1)로, 사진 없이 제목만 있으면 글처럼 한 줄로 보여 줍니다.
 */
export function SponsoredPostLine({ unit }: { unit: DirectCreative | null }) {
  const fill = pickFill(unit, "hide");
  if (fill.kind !== "direct") {
    // 직판 광고가 없으면 구글 광고(목록 사이) — 광고 단위가 안 정해졌으면 칸을 남기지 않음
    if (!adsenseSlotId("infeed")) return null;
    return (
      <li className="board-sponsor list-none px-2 py-2 sm:px-3">
        <GoogleAdUnit placement="infeed" />
      </li>
    );
  }
  const creative = fill.creative;
  const label = creative.title || creative.advertiser || "광고";

  if (creative.imageUrl) {
    return (
      <li className="board-sponsor list-none px-2 py-2 sm:px-3">
        <Link
          href={creative.href}
          aria-label={`${label} (광고)`}
          className="group relative block aspect-[3/1] w-full overflow-hidden rounded-xl bg-black ring-1 ring-[#c9a25c]/50 hover:ring-[#e7c98a]"
        >
          {/* 3:1이 아닌 예전 사진도 잘리지 않게: 같은 사진을 흐리게 깔고 가운데에 전체를 보여 줍니다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sizedImage(creative.imageUrl, 480)}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sizedImage(creative.imageUrl, 480)}
            alt={label}
            width={1200}
            height={400}
            loading="lazy"
            className="relative size-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-[#e7c98a] ring-1 ring-[#c9a25c]/60">
            {creative.mark}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li className="board-sponsor list-none px-2 py-2 sm:px-3">
      <Link
        href={creative.href}
        className="touch-target flex min-h-14 items-center gap-3 rounded-xl border border-[#c9a25c]/60 bg-gradient-to-r from-[#3a2a17] to-[#221a12] px-4 py-3 hover:border-[#e7c98a]"
      >
        <span className="shrink-0 rounded-full border border-[#C59B27] bg-[#1C1819] px-2.5 py-0.5 text-[11px] font-semibold text-[#C59B27]">
          {creative.mark}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold leading-snug text-white">{creative.title}</span>
          <span className="mt-0.5 block truncate text-xs text-[#c9b48a]">
            {creative.advertiser ? `${creative.advertiser} · ` : ""}광고
          </span>
        </span>
        <span className="shrink-0 text-sm font-bold text-[#e7c98a]">→</span>
      </Link>
    </li>
  );
}
