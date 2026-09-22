export type SponsorMark = "AD" | "제휴";

export type SidebarSponsor = {
  slot: 1 | 2 | 3;
  imageUrl: string | null;
  href: string;
  title: string;
  advertiser: string;
  mark: SponsorMark;
};

/** 우측 300×150 세로 3단. imageUrl이 없으면 빈 구좌. */
export const SIDEBAR_SPONSORS: SidebarSponsor[] = [
  { slot: 1, imageUrl: null, href: "/advertise", title: "스폰서 배너 1", advertiser: "", mark: "AD" },
  { slot: 2, imageUrl: null, href: "/advertise", title: "스폰서 배너 2", advertiser: "", mark: "AD" },
  { slot: 3, imageUrl: null, href: "/advertise", title: "스폰서 배너 3", advertiser: "", mark: "AD" },
];

export const NATIVE_SPONSOR = {
  title: "딜러 전용 유니폼, 지금 런칭 혜택으로 맞추세요",
  advertiser: "DEALER FIT",
  href: "/advertise",
  hint: "커뮤니티 제휴 상품 · 사이드바·홈 카드와 함께 노출",
};

export const AD_PRODUCTS = [
  {
    id: "sidebar",
    code: "A1–A3",
    name: "사이드바 배너 1칸",
    size: "300 × 150 px · 세로 3단 중 1칸",
    price: "월 120,000원",
    weekly: "주 35,000원",
    exclusive: "칸마다 1팀 · 한 화면에 최대 3칸",
    where: "PC 넓은 화면에서는 오른쪽 칼럼, 프로필 아래 300×150이 세로로 세 장 쌓입니다. 화면이 좁아 오른쪽 칼럼이 없으면 목록 맨 아래에 같은 세 장이 내려갑니다.",
    why: "한 칸만 두면 자리가 남고, 세 칸을 나눠 팔면 단가를 낮출 수 있습니다. 칸당 월 12만은 예전 단독 18만보다 낮고, 3칸을 한 팀이 다 쓰면 월 36만입니다.",
  },
  {
    id: "home-card",
    code: "B",
    name: "홈 홍보 포스터",
    size: "5:7 포스터 · 홈 3칸 중 1칸",
    price: "월 450,000원",
    weekly: "주 120,000원",
    exclusive: "최대 9팀이 3칸을 순환 · 단독 고정 아님",
    where: "홈 맨 위 「지금, 진행중인 홍보 포스터」입니다. 한 번에 3장이 보이고, 3초마다 한 칸씩 왼쪽으로 밀립니다. 풀은 최대 9장입니다. 포스터에는 [AD] 또는 [제휴] 마크가 붙습니다.",
    why: "첫 화면이지만 3칸·순환이라 카페 메인 고정 배너(월 50~80만)보다 노출이 나눠집니다. 그래서 월 45만으로 맞춰 두었습니다. 자리를 혼자 쓰고 싶으면 문의 시 단독 옵션을 따로 받습니다.",
  },
  {
    id: "native",
    code: "C",
    name: "네이티브 인피드",
    size: "목록 한 줄",
    price: "월 220,000원",
    weekly: "주 60,000원",
    exclusive: "해당 목록에 1줄",
    where: "홈 최신 게시글, 게시판 목록에서 위에서 3번째와 4번째 글 사이에 삽입됩니다. 일반 글처럼 한 줄로 보이되 [AD]·[제휴] 표시가 있습니다.",
    why: "스크롤 중에만 보이므로 배너보다 싸게 잡습니다. 카페 게시글형 홍보(월 15~30만)와 비슷한 구간입니다.",
  },
  {
    id: "pack",
    code: "A+B+C",
    name: "월간 패키지",
    size: "배너 + 포스터 + 인피드 + 공식 홍보 글 1회",
    price: "월 700,000원",
    weekly: "주 단위 없음",
    exclusive: "묶음 계약 · 따로 사면 월 79만",
    where: "사이드바 1칸 + 홈 포스터 1칸 + 인피드 1줄 + 공식 홍보 글 1회입니다. 사이드바 3칸 모두는 문의 때 따로 받습니다.",
    why: "사이드바 1칸(12만) + 포스터(45만) + 인피드(22만)를 따로 사면 월 79만입니다. 한 달 묶음은 70만입니다.",
  },
] as const;
