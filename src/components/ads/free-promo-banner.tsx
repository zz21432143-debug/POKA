import Link from "next/link";
import { FREE_PROMO } from "@/lib/free-promo";
import { cn } from "cn";

/** POKA 마스코트(파비콘 그림)를 빨간 테 안에 넣어 보여 줍니다. */
export function PokaMascot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-[22%] bg-[#c8282c] p-[3px] shadow-[0_0_18px_rgba(255,59,48,0.35)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-flame.png" alt="POKA 마스코트" className="size-full rounded-[20%] object-cover" />
    </span>
  );
}

/** 브랜드 시안의 붓글씨 "POKA" 로고 */
export function PokaBrush({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/poka-brush.png" alt="POKA" className={cn("h-auto select-none", className)} draggable={false} />;
}

/** "무료 홍보 이벤트" 글자 + 밑에 깔린 빨간 붓 획 */
export function FreePromoTitle({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block font-black leading-none tracking-tight text-[#f6efe6]", className)}>
      <svg
        aria-hidden
        viewBox="0 0 320 40"
        preserveAspectRatio="none"
        className="absolute -inset-x-[6%] bottom-[-18%] -z-0 h-[62%] w-[112%]"
      >
        <path d="M6 18 C60 4 170 0 306 6 C314 8 316 16 306 20 C206 24 108 30 16 38 C2 40 -4 24 6 18 Z" fill="#c8282c" opacity="0.9" />
      </svg>
      <span className="relative">무료 홍보 이벤트</span>
    </span>
  );
}

/**
 * "POKA 무료 홍보 이벤트" 배너. 비어 있는 홍보·광고 자리에 넣습니다.
 * 브랜드 시안처럼 먹색 바탕에 붓글씨 POKA, 빨간 붓 획을 씁니다.
 * wide: 게시판·메인 하단 가로 띠, card: 오른쪽 제휴 카드 자리
 */
export function FreePromoBanner({ variant, className }: { variant: "wide" | "card"; className?: string }) {
  if (variant === "card") {
    return (
      <Link
        href={FREE_PROMO.href}
        aria-label={FREE_PROMO.title}
        className={cn(
          "group mx-auto flex w-full max-w-[300px] flex-col items-center gap-2.5 overflow-hidden rounded-[1.25rem] border border-[#c9a36a]/50 bg-gradient-to-b from-[#241011] via-[#140d0d] to-[#0c0a0a] px-4 py-5 text-center shadow-[0_8px_24px_rgb(0_0_0/0.4)] hover:border-[#c9a36a]",
          className,
        )}
      >
        <span className="text-[10px] font-bold tracking-[0.4em] text-[#c9a36a]">FREE PROMOTION</span>
        <PokaMascot className="size-16" />
        <PokaBrush className="w-36" />
        <FreePromoTitle className="text-2xl" />
        <span className="mt-1 text-xs leading-5 text-[#e8dfd3]">매장 · 대회 · 팀 · 유튜버 홍보를 POKA 메인에 무료로 올려 드려요</span>
        <span className="mt-1 inline-flex min-h-10 items-center rounded-lg bg-[#c8282c] px-5 text-sm font-black text-[#f6efe6] group-hover:bg-[#d93a3e]">
          지금 신청하기 →
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={FREE_PROMO.href}
      aria-label={FREE_PROMO.title}
      className={cn(
        "group flex min-h-[104px] items-center gap-3 overflow-hidden rounded-xl border border-[#c9a36a]/50 bg-gradient-to-r from-[#241011] via-[#140d0d] to-[#0c0a0a] px-4 py-3 shadow-[0_6px_18px_rgb(0_0_0/0.35)] hover:border-[#c9a36a] sm:px-6",
        className,
      )}
    >
      <PokaMascot className="size-14 sm:size-16" />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="flex items-center gap-2">
          <PokaBrush className="w-20 sm:w-24" />
          <FreePromoTitle className="text-lg sm:text-xl" />
        </span>
        <span className="block text-xs text-[#e8dfd3] sm:text-sm">매장 · 대회 · 팀 · 유튜버 홍보를 POKA 메인에 무료로 올려 드려요</span>
      </span>
      <span className="hidden shrink-0 rounded-lg bg-[#c8282c] px-4 py-2.5 text-sm font-black text-[#f6efe6] group-hover:bg-[#d93a3e] sm:inline-flex">
        신청하기 →
      </span>
    </Link>
  );
}
