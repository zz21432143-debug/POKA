/** AdSense 게시자 ID. 없으면 잔여 칸에 목업이 뜹니다. */
export function adsensePublisherId(): string | null {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
  return id.startsWith("ca-pub-") ? id : null;
}

export function adsenseSlotId(slot: 1 | 2 | 3): string {
  const bySlot = {
    1: process.env.NEXT_PUBLIC_ADSENSE_SLOT_A1,
    2: process.env.NEXT_PUBLIC_ADSENSE_SLOT_A2,
    3: process.env.NEXT_PUBLIC_ADSENSE_SLOT_A3,
  }[slot]?.trim();
  if (bySlot) return bySlot;
  return process.env.NEXT_PUBLIC_ADSENSE_SLOT_A?.trim() ?? "";
}

export const GOOGLE_REMNANT_MOCKS = [
  {
    slot: 1 as const,
    kicker: "쇼핑",
    title: "장바구니 할인, 오늘만",
    line: "구글 디스플레이 네트워크",
    tone: "from-sky-100 to-white",
  },
  {
    slot: 2 as const,
    kicker: "배송",
    title: "자정 전 주문 내일 도착",
    line: "구글 디스플레이 네트워크",
    tone: "from-amber-100 to-white",
  },
  {
    slot: 3 as const,
    kicker: "금융",
    title: "카드 캐시백 비교",
    line: "구글 디스플레이 네트워크",
    tone: "from-violet-100 to-white",
  },
] as const;
