import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { FreePromoBanner } from "@/components/ads/free-promo-banner";

/**
 * 게시판 목록·메인 하단 구글 애드센스 배너 자리.
 * Vercel에 광고 단위 ID(게시판: NEXT_PUBLIC_ADSENSE_SLOT_BOARD_BOTTOM, 메인: NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM)를
 * 넣으면 실제 광고가 나오고, 그 전에는 "POKA 무료 홍보 이벤트" 배너가 보입니다.
 */
export function BoardBottomAd({ placement = "board-bottom" }: { placement?: "board-bottom" | "home-bottom" }) {
  return (
    <GoogleAdUnit
      placement={placement}
      className="mt-2"
      fallback={<FreePromoBanner variant="wide" className="mt-2" />}
    />
  );
}
