export const SPONSOR_PLACEMENTS = ["A1", "A2", "A3", "SIDEBAR", "NATIVE"] as const;
export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number];

/** 본문 하단 A1–A3 가로 배너(화면 비율 2:1) */
export const BANNER_SIZE = "가로 배너 1200×600px (2:1)";
/** 직판 소재 사진 칸 크기(올린 사진을 이 크기로 자동 맞춤) */
export const PLACEMENT_IMAGE: Record<SponsorPlacement, { width: number; height: number }> = {
  A1: { width: 1200, height: 600 },
  A2: { width: 1200, height: 600 },
  A3: { width: 1200, height: 600 },
  SIDEBAR: { width: 600, height: 500 },
  NATIVE: { width: 600, height: 450 },
};

/** 메인 B1–B6 세로 포스터(화면 비율 5:7) */
export const POSTER_SIZE = "세로 포스터 1000×1400px (5:7)";

export const PLACEMENT_META: Record<
  SponsorPlacement,
  /** size: 관리자 화면에 보이는 권장 소재 크기(화면 비율에 맞춤) */
  { name: string; hint: string; size: string; empty: "adsense" | "cta" | "hide"; needImage: boolean }
> = {
  A1: {
    name: "본문 하단 A1",
    hint: "홈·게시판 아래 가로 3칸 중 왼쪽. 사진 없으면 구글이 채웁니다.",
    size: BANNER_SIZE,
    empty: "adsense",
    needImage: true,
  },
  A2: {
    name: "본문 하단 A2",
    hint: "홈·게시판 아래 가로 3칸 중 가운데. 사진 없으면 구글이 채웁니다.",
    size: BANNER_SIZE,
    empty: "adsense",
    needImage: true,
  },
  A3: {
    name: "본문 하단 A3",
    hint: "홈·게시판 아래 가로 3칸 중 오른쪽. 사진 없으면 구글이 채웁니다.",
    size: BANNER_SIZE,
    empty: "adsense",
    needImage: true,
  },
  SIDEBAR: {
    name: "사이드바 배너 (S)",
    hint: "사진이 없으면 문의 CTA. 구글은 이 칸을 쓰지 않습니다.",
    size: "사이드바 배너 600×500px (6:5)",
    empty: "cta",
    needImage: true,
  },
  NATIVE: {
    name: "네이티브 인피드 (C)",
    hint: "제목이 있으면 목록 3~4번째 사이에 한 줄. 없으면 숨깁니다.",
    size: "썸네일 600×450px (4:3) · 사진 없이 제목만도 가능",
    empty: "hide",
    needImage: false,
  },
};

export type DirectCreative = {
  placement: SponsorPlacement;
  imageUrl: string | null;
  href: string;
  title: string;
  advertiser: string;
  mark: "AD" | "제휴";
};

export function normalizeMark(value?: string | null, isPaid?: boolean): "AD" | "제휴" {
  if (isPaid) return "AD";
  if (value === "AD" || value === "광고") return "AD";
  return "제휴";
}

export function isDirectFilled(
  unit: { enabled?: boolean; imageUrl?: string | null; title?: string | null } | null,
  needImage: boolean,
) {
  if (!unit || unit.enabled === false) return false;
  if (needImage) return Boolean(unit.imageUrl);
  return Boolean(unit.title?.trim() || unit.imageUrl);
}

export function pickFill(
  direct: DirectCreative | null,
  empty: "adsense" | "cta" | "hide",
  needImage = false,
): { kind: "direct"; creative: DirectCreative } | { kind: "adsense" } | { kind: "cta" } | { kind: "hide" } {
  if (isDirectFilled(direct, needImage) && direct) {
    return { kind: "direct", creative: direct };
  }
  if (empty === "adsense") return { kind: "adsense" };
  if (empty === "hide") return { kind: "hide" };
  return { kind: "cta" };
}
