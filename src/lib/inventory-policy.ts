export const SPONSOR_PLACEMENTS = ["A1", "A2", "A3", "SIDEBAR", "NATIVE"] as const;
export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number];

export const PLACEMENT_META: Record<
  SponsorPlacement,
  { name: string; hint: string; empty: "adsense" | "cta" | "hide"; needImage: boolean }
> = {
  A1: {
    name: "본문 하단 A1",
    hint: "홈·게시판 아래 가로 3칸 중 왼쪽. 이미지 없으면 구글이 채웁니다.",
    empty: "adsense",
    needImage: true,
  },
  A2: {
    name: "본문 하단 A2",
    hint: "홈·게시판 아래 가로 3칸 중 가운데. 이미지 없으면 구글이 채웁니다.",
    empty: "adsense",
    needImage: true,
  },
  A3: {
    name: "본문 하단 A3",
    hint: "홈·게시판 아래 가로 3칸 중 오른쪽. 이미지 없으면 구글이 채웁니다.",
    empty: "adsense",
    needImage: true,
  },
  SIDEBAR: {
    name: "사이드바 배너 (S)",
    hint: "이미지 URL이 없으면 문의 CTA. 구글은 이 칸을 쓰지 않습니다.",
    empty: "cta",
    needImage: true,
  },
  NATIVE: {
    name: "네이티브 인피드 (C)",
    hint: "제목이 있으면 목록 3~4번째 사이에 한 줄. 없으면 숨깁니다.",
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
