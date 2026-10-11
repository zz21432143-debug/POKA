import Link from "next/link";
import { GoogleAdUnit } from "@/components/ads/google-ad-unit";

/**
 * 모든 게시판 목록 아래 구글 애드센스 배너 자리.
 * Vercel에 NEXT_PUBLIC_ADSENSE_SLOT_BOARD_BOTTOM(광고 단위 ID)을 넣으면 실제 광고가 나오고,
 * 그 전에는 광고 문의 자리로 보입니다.
 */
export function BoardBottomAd() {
  return (
    <GoogleAdUnit
      placement="board-bottom"
      className="mt-2"
      fallback={
        <Link
          href="/advertise"
          aria-label="광고 문의"
          className="mt-2 flex min-h-[100px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#3a332c] bg-[#1C1819]/80 px-4 text-center hover:border-[#c9a25c]/60"
        >
          <span className="text-[11px] font-bold tracking-wide text-[#9CA3AF]">광고</span>
          <span className="text-sm font-semibold text-[#E5E7EB]">이 자리에 광고를 올려 보세요</span>
          <span className="text-xs text-[#e7c98a]">제휴 · 광고 문의 →</span>
        </Link>
      }
    />
  );
}
