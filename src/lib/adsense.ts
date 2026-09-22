/** AdSense 게시자 ID. 없으면 잔여 칸에 목업이 뜹니다. */
export type AdSensePlacement = "post-top" | "post-bottom" | "sidebar" | "a1" | "a2" | "a3";

export function adsensePublisherId(): string | null {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
  return id.startsWith("ca-pub-") ? id : null;
}

export function adsenseSlotId(placement: AdSensePlacement): string {
  const byPlacement = {
    "post-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_TOP,
    "post-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_BOTTOM,
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR,
    a1: process.env.NEXT_PUBLIC_ADSENSE_SLOT_A1,
    a2: process.env.NEXT_PUBLIC_ADSENSE_SLOT_A2,
    a3: process.env.NEXT_PUBLIC_ADSENSE_SLOT_A3,
  }[placement]?.trim();
  if (byPlacement) return byPlacement;
  return process.env.NEXT_PUBLIC_ADSENSE_SLOT_A?.trim() ?? "";
}

export const GOOGLE_REMNANT_MOCKS: Record<
  AdSensePlacement,
  { kicker: string; title: string; line: string; tone: string }
> = {
  "post-top": {
    kicker: "쇼핑",
    title: "장바구니 할인, 오늘만",
    line: "구글 디스플레이 · 본문 상단",
    tone: "from-sky-100 to-white",
  },
  "post-bottom": {
    kicker: "배송",
    title: "자정 전 주문 내일 도착",
    line: "구글 디스플레이 · 본문 하단",
    tone: "from-amber-100 to-white",
  },
  sidebar: {
    kicker: "금융",
    title: "카드 캐시백 비교",
    line: "구글 디스플레이 · 사이드바 하단",
    tone: "from-violet-100 to-white",
  },
  a1: {
    kicker: "쇼핑",
    title: "장바구니 할인, 오늘만",
    line: "구글 디스플레이 · A1",
    tone: "from-sky-100 to-white",
  },
  a2: {
    kicker: "배송",
    title: "자정 전 주문 내일 도착",
    line: "구글 디스플레이 · A2",
    tone: "from-amber-100 to-white",
  },
  a3: {
    kicker: "금융",
    title: "카드 캐시백 비교",
    line: "구글 디스플레이 · A3",
    tone: "from-violet-100 to-white",
  },
};
