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
    name: "하단 가로 배너 A1 (왼쪽)",
    hint: "글 목록 맨 아래 가로 배너 3개 중 왼쪽. 비워 두면 구글 광고가 나옵니다.",
    size: BANNER_SIZE,
    empty: "adsense",
    needImage: true,
  },
  A2: {
    name: "하단 가로 배너 A2 (가운데)",
    hint: "글 목록 맨 아래 가로 배너 3개 중 가운데. 비워 두면 구글 광고가 나옵니다.",
    size: BANNER_SIZE,
    empty: "adsense",
    needImage: true,
  },
  A3: {
    name: "하단 가로 배너 A3 (오른쪽)",
    hint: "글 목록 맨 아래 가로 배너 3개 중 오른쪽. 비워 두면 구글 광고가 나옵니다.",
    size: BANNER_SIZE,
    empty: "adsense",
    needImage: true,
  },
  SIDEBAR: {
    name: "오른쪽 사이드 배너 (S)",
    hint: "PC는 오른쪽 내 프로필 아래, 휴대폰은 맨 아래 가로 배너 밑. 비워 두면 '광고 문의' 안내가 나옵니다.",
    size: "사이드 배너 600×500px (6:5)",
    empty: "cta",
    needImage: true,
  },
  NATIVE: {
    name: "글 목록 속 광고 (C)",
    hint: "커뮤니티 게시판·홈 최신글 목록에서 3번째 글 바로 아래 한 줄(구인 게시판 제외). 제목을 넣어야 보이고, 비우면 안 나옵니다.",
    size: "사진 600×450px (4:3) · 사진은 선택",
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
