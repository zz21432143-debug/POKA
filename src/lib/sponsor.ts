export type SponsorMark = "AD" | "제휴";

export type SidebarSponsor = {
  imageUrl: string | null;
  href: string;
  title: string;
  advertiser: string;
  mark: SponsorMark;
};

/** 우측 300×150 구좌. imageUrl이 없으면 제휴 문의 플레이스홀더.
 *  예시 소재: "/ads/sidebar-example-300x150.svg" */
export const SIDEBAR_SPONSOR: SidebarSponsor = {
  imageUrl: null,
  href: "/advertise",
  title: "스폰서 배너",
  advertiser: "",
  mark: "AD",
};

export const NATIVE_SPONSOR = {
  title: "딜러 전용 유니폼, 지금 런칭 혜택으로 맞추세요",
  advertiser: "DEALER FIT",
  href: "/advertise",
  hint: "커뮤니티 제휴 상품 · 사이드바·홈 카드와 함께 노출",
};

export const AD_PRODUCTS = [
  {
    id: "sidebar",
    name: "사이드바 배너",
    size: "300 × 150",
    price: "주 120,000원",
    blurb: "프로필 바로 아래 고정 노출. 커스텀 이미지 1장.",
  },
  {
    id: "home-card",
    name: "홈 홍보 카드",
    size: "메인 6구좌 중 1칸",
    price: "주 250,000원",
    blurb: "[AD] 또는 [제휴] 마크와 함께 홈 상단에 노출.",
  },
  {
    id: "native",
    name: "네이티브 인피드",
    size: "최신글 3~4번째 사이",
    price: "주 180,000원",
    blurb: "게시글 목록에 녹아드는 제휴 홍보 한 줄.",
  },
  {
    id: "pack",
    name: "월간 패키지",
    size: "배너 + 카드 + 인피드",
    price: "월 800,000원",
    blurb: "세 구좌를 묶고, 공식 홍보 글 1회를 포함합니다.",
  },
] as const;
