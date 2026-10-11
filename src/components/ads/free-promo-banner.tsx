import Link from "next/link";
import { FREE_PROMO } from "@/lib/free-promo";
import { cn } from "cn";

/** POKA 마스코트(사이트 위쪽 로고의 불꽃 캐릭터)를 금테 안에 넣어 보여 줍니다. */
export function PokaMascot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-[22%] bg-gradient-to-br from-[#f6dfa0] to-[#c9952f] p-[3px] shadow-[0_0_14px_rgba(255,68,68,0.45)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/logo-flame.png" alt="POKA 마스코트" className="size-full rounded-[20%] object-cover" />
    </span>
  );
}

/**
 * "POKA 무료 홍보 이벤트" 배너. 비어 있는 홍보·광고 자리에 넣습니다.
 * wide: 게시판·메인 하단 가로 띠, card: 오른쪽 제휴 카드 자리
 */
export function FreePromoBanner({ variant, className }: { variant: "wide" | "card"; className?: string }) {
  if (variant === "card") {
    return (
      <Link
        href={FREE_PROMO.href}
        aria-label={FREE_PROMO.title}
        className={cn(
          "group mx-auto flex w-full max-w-[300px] flex-col items-center gap-2 overflow-hidden rounded-[1.25rem] border-2 border-[#c9952f]/80 bg-gradient-to-b from-[#5a1418] via-[#2a0f10] to-[#140a0a] px-4 py-5 text-center shadow-[0_8px_24px_rgb(0_0_0/0.4)] hover:border-[#f6dfa0]",
          className,
        )}
      >
        <span className="rounded-full bg-gradient-to-r from-[#f6dfa0] to-[#c9952f] px-3 py-0.5 text-[11px] font-black tracking-[0.25em] text-[#2a0f10]">
          EVENT
        </span>
        <PokaMascot className="size-16" />
        <span className="text-xl font-black leading-tight text-white">
          POKA <span className="bg-gradient-to-r from-[#f6dfa0] to-[#c9952f] bg-clip-text text-transparent">무료 홍보</span> 이벤트
        </span>
        <span className="text-xs leading-5 text-[#f3eadb]">매장 · 대회 · 팀 · 유튜버 홍보를 POKA 메인에 무료로 올려 드려요</span>
        <span className="mt-1 inline-flex min-h-10 items-center rounded-full bg-gradient-to-r from-[#f6dfa0] to-[#c9952f] px-5 text-sm font-black text-[#2a0f10] group-hover:brightness-110">
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
        "group flex min-h-[100px] items-center gap-3 overflow-hidden rounded-xl border-2 border-[#c9952f]/80 bg-gradient-to-r from-[#5a1418] via-[#2a0f10] to-[#140a0a] px-4 py-3 shadow-[0_6px_18px_rgb(0_0_0/0.35)] hover:border-[#f6dfa0] sm:px-6",
        className,
      )}
    >
      <PokaMascot className="size-12 sm:size-14" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-[#f6dfa0]/15 px-2 py-0.5 text-[10px] font-black tracking-[0.2em] text-[#f6dfa0]">EVENT</span>
        </span>
        <span className="mt-0.5 block text-base font-black leading-snug text-white sm:text-lg">
          POKA <span className="text-[#f6dfa0]">무료 홍보</span> 이벤트
        </span>
        <span className="block text-xs text-[#f3eadb] sm:text-sm">매장 · 대회 · 팀 · 유튜버 홍보를 POKA 메인에 무료로 올려 드려요</span>
      </span>
      <span className="hidden shrink-0 rounded-full bg-gradient-to-r from-[#f6dfa0] to-[#c9952f] px-4 py-2 text-sm font-black text-[#2a0f10] group-hover:brightness-110 sm:inline-flex">
        신청하기 →
      </span>
    </Link>
  );
}
