export type NavItem = {
  href: string;
  label: string;
  hint: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const BOARD_NAV: NavGroup[] = [
  {
    title: "커뮤니티",
    items: [
      { href: "/boards/free", label: "자유게시판", hint: "잡담 · 룰 질문" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "스팟 분석" },
      { href: "/boards/store-review", label: "매장후기", hint: "룸 · 딜러 후기" },
      { href: "/attendance", label: "출석체크", hint: "매일 출석 EXP" },
    ],
  },
  {
    title: "구인 3종",
    items: [
      { href: "/boards/jobs/dealer", label: "딜러 구인", hint: "라이브 딜러" },
      { href: "/boards/jobs/staff", label: "스태프 구인", hint: "플로어 · 운영" },
      { href: "/boards/jobs/player", label: "플레이어 구인", hint: "게임 · 세션" },
    ],
  },
  {
    title: "홍보",
    items: [
      { href: "/boards/promo", label: "홍보게시판", hint: "스터디 · 이벤트" },
    ],
  },
];

export const BOARD_SLUGS = {
  free: { title: "자유게시판", boardType: "FREE" as const },
  "hand-review": { title: "핸드리뷰", boardType: "HAND_REVIEW" as const },
  "store-review": { title: "매장후기", boardType: "ANONYMOUS_REVIEW" as const },
  promo: { title: "홍보게시판", boardType: "PROMO" as const },
} as const;

export const JOB_KINDS = {
  dealer: { title: "딜러 구인", blurb: "캐주얼·토너먼트 딜러 구인/구직" },
  staff: { title: "스태프 구인", blurb: "플로어, 칩런, 운영 스태프" },
  player: { title: "플레이어 구인", blurb: "세션 멤버, 스터디 플레이어" },
} as const;
