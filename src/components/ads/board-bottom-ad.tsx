import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { FreePromoBanner } from "@/components/ads/free-promo-banner";

/**
 * 게시판 목록·메인 하단 구글 애드센스 배너 자리.
 * Vercel에 광고 단위 ID(게시판: NEXT_PUBLIC_ADSENSE_SLOT_BOARD_BOTTOM, 메인: NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM)를
 * 넣으면 실제 광고가 나오고, 그 전에는 "POKA 무료 홍보 이벤트" 배너가 보입니다.
 * 메인은 위 포스터 칸에 무료 홍보가 이미 있어서, 광고가 없으면 아무것도 두지 않습니다(같은 홍보 반복 X).
 */
export function BoardBottomAd({ placement = "board-bottom" }: { placement?: "board-bottom" | "home-bottom" }) {
  return (
    <GoogleAdUnit
      placement={placement}
      className="mt-2"
      fallback={placement === "home-bottom" ? null : <FreePromoBanner variant="wide" className="mt-2" />}
    />
  );
}

/**
 * 홀덤 공부 도구 · 랭킹 광고 자리: 광고 단위 ID(NEXT_PUBLIC_ADSENSE_SLOT_BOARD_BOTTOM)가 있을 때만 광고,
 * 없으면(애드센스 승인 전) 빈칸 — 도구마다 같은 무료 홍보 배너가 반복되지 않게.
 */
export function StudyAd() {
  return <GoogleAdUnit placement="board-bottom" className="mt-2" fallback={null} />;
}
