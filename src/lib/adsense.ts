/** AdSense 게시자 ID. 없으면 잔여 칸에 목업이 뜹니다. */
export type AdSensePlacement =
  | "post-top"
  | "post-bottom"
  | "board-bottom"
  | "home-bottom"
  | "home-top"
  | "home-mid"
  | "post-mid"
  | "infeed"
  | "sidebar"
  | "a1"
  | "a2"
  | "a3";

export const DEFAULT_ADSENSE_CLIENT = "ca-pub-9633875249094546";

function parseAdsenseClient(id: string) {
  return id.startsWith("ca-pub-") ? id : null;
}

export function adsensePublisherId(): string | null {
  return parseAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "") ?? parseAdsenseClient(DEFAULT_ADSENSE_CLIENT);
}

/** 긴 글(1,200자 넘음)을 가운데 문단 사이에서 둘로 나눔 — 광고를 끼우려고. 짧으면 null */
export function splitForMidAd(text: string): [string, string] | null {
  if (text.length < 1200) return null;
  const mid = Math.floor(text.length / 2);
  const near = (sep: string) => {
    const after = text.indexOf(sep, mid);
    const before = text.lastIndexOf(sep, mid);
    const pick = [before, after].filter((i) => i > 200 && i < text.length - 200).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    return pick ?? -1;
  };
  const at = near("\n\n") >= 0 ? near("\n\n") : near("\n");
  if (at < 0) return null;
  return [text.slice(0, at).trimEnd(), text.slice(at).trimStart()];
}

export function adsenseSlotId(placement: AdSensePlacement): string {
  const byPlacement = {
    "post-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_TOP,
    "post-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_BOTTOM,
    "board-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_BOARD_BOTTOM,
    "home-bottom": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM,
    "home-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP,
    "home-mid": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID,
    "post-mid": process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_MID,
    infeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED,
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
  "board-bottom": {
    kicker: "쇼핑",
    title: "오늘의 추천 상품",
    line: "구글 디스플레이 · 게시판 하단",
    tone: "from-emerald-100 to-white",
  },
  "home-bottom": {
    kicker: "쇼핑",
    title: "오늘의 추천 상품",
    line: "구글 디스플레이 · 메인 하단",
    tone: "from-rose-100 to-white",
  },
  "home-top": {
    kicker: "쇼핑",
    title: "오늘의 추천 상품",
    line: "구글 디스플레이 · 메인 상단",
    tone: "from-rose-100 to-white",
  },
  "home-mid": {
    kicker: "쇼핑",
    title: "오늘의 추천 상품",
    line: "구글 디스플레이 · 메인 가운데",
    tone: "from-rose-100 to-white",
  },
  "post-mid": {
    kicker: "추천",
    title: "관련 추천",
    line: "구글 디스플레이 · 긴 글 가운데",
    tone: "from-sky-100 to-white",
  },
  infeed: {
    kicker: "추천",
    title: "관련 추천",
    line: "구글 디스플레이 · 글 목록 사이",
    tone: "from-amber-100 to-white",
  },
  sidebar: {
    kicker: "금융",
    title: "생활 할인 모아보기",
    line: "구글 디스플레이 · 사이드바 하단",
    tone: "from-violet-100 to-white",
  },
  a1: {
    kicker: "쇼핑",
    title: "장바구니 할인, 오늘만",
    line: "관련 추천",
    tone: "from-sky-100 to-white",
  },
  a2: {
    kicker: "배송",
    title: "자정 전 주문 내일 도착",
    line: "관련 추천",
    tone: "from-amber-100 to-white",
  },
  a3: {
    kicker: "금융",
    title: "생활 할인 모아보기",
    line: "관련 추천",
    tone: "from-violet-100 to-white",
  },
};
