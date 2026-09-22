import type { BoardType } from "@/generated/prisma/enums";

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
    title: "공식",
    items: [
      { href: "/boards/official", label: "📢 공식 홍보", hint: "검증 매장" },
      { href: "/boards/schedule", label: "📅 전국 대회 일정", hint: "관리자" },
    ],
  },
  {
    title: "구인 3종",
    items: [
      { href: "/boards/jobs/fixed", label: "고정 직원 구인", hint: "상시 · 고정" },
      { href: "/boards/jobs/apply", label: "지원 딜러 구인", hint: "단기 · 스팟" },
      { href: "/boards/jobs/team", label: "딜러 팀 구인", hint: "팀원 모집" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { href: "/boards/free", label: "💬 딜러 커뮤니티", hint: "후기·룰·수다" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "스팟 분석" },
      { href: "/boards/store-review", label: "매장후기", hint: "익명 후기" },
      { href: "/attendance", label: "출석체크", hint: "매일 출석 EXP" },
    ],
  },
];

export const BOARD_SLUGS = {
  free: { title: "딜러 커뮤니티", boardType: "FREE" as const, writeHref: "/boards/free/write" },
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
  official: {
    title: "공식 홍보",
    boardType: "PROMO" as const,
    writeHref: "/boards/official/write",
    gallery: true,
  },
  promo: {
    title: "공식 홍보",
    boardType: "PROMO" as const,
    writeHref: "/boards/official/write",
    gallery: true,
  },
  schedule: {
    title: "전국 대회 일정",
    boardType: "SCHEDULE" as const,
    writeHref: "/boards/schedule/write",
    calendar: true,
    adminOnly: true,
  },
} as const;

export type BoardSlug = keyof typeof BOARD_SLUGS;

export function resolveBoardSlug(slug: string) {
  return BOARD_SLUGS[slug as BoardSlug] ?? null;
}

export const JOB_KINDS = {
  fixed: {
    title: "고정 직원 구인",
    blurb: "룸·펍의 상시 고정 직원 모집",
    kind: "FIXED" as const,
  },
  apply: {
    title: "지원 딜러 구인",
    blurb: "단기·스팟 딜러 지원자 전용",
    kind: "APPLY" as const,
  },
  team: {
    title: "딜러 팀 구인",
    blurb: "딜러 팀원 모집",
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

export const WRITE_HINT: Partial<Record<BoardType, string>> = {
  PROMO: "검증된 매장의 공식 홍보물만 등록합니다. 배너 구좌 1~6과 연동됩니다.",
  SCHEDULE: "관리자만 메이저·지역 홀덤 대회 일정을 올립니다.",
  JOBS: "제목은 지역·상호(조건)로 자동 생성됩니다.",
  FREE: "현장 후기, 룰 질문, 자유 수다.",
};
