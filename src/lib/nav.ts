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
      { href: "/boards/store-review", label: "매장후기", hint: "익명 후기" },
      { href: "/attendance", label: "출석체크", hint: "매일 출석 EXP" },
    ],
  },
  {
    title: "구인 3종",
    items: [
      { href: "/boards/jobs/fixed", label: "고정 직원 구인", hint: "상시 · 고정 자리" },
      { href: "/boards/jobs/apply", label: "지원 딜러 구인", hint: "지원서형 모집" },
      { href: "/boards/jobs/team", label: "딜러 팀 구인", hint: "세션 · 팀 구성" },
    ],
  },
  {
    title: "홍보",
    items: [
      { href: "/boards/promo", label: "홍보게시판", hint: "일반 · 프리미엄 배너" },
    ],
  },
];

export const BOARD_SLUGS = {
  free: { title: "자유게시판", boardType: "FREE" as const, writeHref: "/boards/free/write" },
  "hand-review": {
    title: "핸드리뷰",
    boardType: "HAND_REVIEW" as const,
    writeHref: "/boards/hand-review/write",
  },
  "store-review": {
    title: "매장후기",
    boardType: "ANONYMOUS_REVIEW" as const,
    writeHref: "/boards/store-review/write",
  },
  promo: { title: "홍보게시판", boardType: "PROMO" as const, writeHref: "/boards/promo/write" },
} as const;

export const JOB_KINDS = {
  fixed: {
    title: "고정 직원 구인",
    blurb: "룸/클럽의 상시 고정 직원 모집",
    kind: "FIXED" as const,
  },
  apply: {
    title: "지원 딜러 구인",
    blurb: "지원서를 받는 딜러 모집",
    kind: "APPLY" as const,
  },
  team: {
    title: "딜러 팀 구인",
    blurb: "캐주얼 세션·스터디 딜러 팀 구성",
    kind: "TEAM" as const,
  },
} as const;

export const JOB_ALIASES: Record<string, keyof typeof JOB_KINDS> = {
  dealer: "fixed",
  staff: "apply",
  player: "team",
};

export function resolveJobKind(kind: string) {
  const mapped = JOB_ALIASES[kind] ?? kind;
  return JOB_KINDS[mapped as keyof typeof JOB_KINDS] ?? null;
}

export const JOB_KIND_LABEL = {
  FIXED: "고정 직원 구인",
  APPLY: "지원 딜러 구인",
  TEAM: "딜러 팀 구인",
} as const;
