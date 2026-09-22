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
      { href: "/boards/events", label: "🏆 대회 & 이벤트", hint: "관리자 포스터" },
      { href: "/boards/official", label: "📢 공식 홍보", hint: "관리자 포스터" },
      { href: "/boards/schedule", label: "📅 전국 대회 일정", hint: "달력" },
    ],
  },
  {
    title: "구인·구직",
    items: [
      { href: "/boards/hire", label: "🤝 구인 게시판", hint: "기업·팀" },
      { href: "/boards/talent", label: "🙋 구직 / 인재 등록", hint: "개인" },
      { href: "/boards/pickup", label: "⚡ 급구 / 단기 픽업", hint: "전체 회원" },
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
  promo: { title: "프리미엄 배너", boardType: "PROMO" as const, writeHref: "/boards/promo/write" },
  events: {
    title: "대회 & 이벤트 포스터",
    boardType: "EVENT_POSTER" as const,
    writeHref: "/boards/events/write",
    gallery: true,
    adminOnly: true,
  },
  official: {
    title: "공식 홍보 포스터",
    boardType: "OFFICIAL_POSTER" as const,
    writeHref: "/boards/official/write",
    gallery: true,
    adminOnly: true,
  },
  hire: {
    title: "구인 게시판",
    boardType: "JOBS" as const,
    writeHref: "/boards/hire/write",
    listing: "hire" as const,
  },
  talent: {
    title: "구직 / 인재 등록",
    boardType: "TALENT" as const,
    writeHref: "/boards/talent/write",
    listing: "talent" as const,
  },
  pickup: {
    title: "급구 / 단기 픽업",
    boardType: "PICKUP" as const,
    writeHref: "/boards/pickup/write",
    listing: "pickup" as const,
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
    blurb: "레거시 고정 공고",
    kind: "FIXED" as const,
  },
  apply: {
    title: "지원 딜러 구인",
    blurb: "레거시 지원 공고",
    kind: "APPLY" as const,
  },
  team: {
    title: "딜러 팀 구인",
    blurb: "레거시 팀 공고",
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
  EVENT_POSTER: "관리자만 공식 대회 포스터를 올립니다.",
  OFFICIAL_POSTER: "관리자만 제휴·스폰서 포스터를 올립니다.",
  JOBS: "기업·팀 회원의 정식 구인 공고입니다.",
  TALENT: "딜러·플로어·칩스 스태프가 이력을 올립니다.",
  PICKUP: "대타·주말 단기 스태프 급구입니다.",
  SCHEDULE: "날짜별 전국 토너먼트·카지노 이벤트입니다.",
  FREE: "현장 후기, 룰 질문, 자유 수다.",
};
