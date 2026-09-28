import type { BoardType, JobKind } from "@/generated/prisma/enums";

export type NavItem = {
  href: string;
  label: string;
  hint: string;
};

export type NavGroup = {
  title: string;
  href: string;
  hint: string;
  accent: "emerald" | "gold";
  items: NavItem[];
};

export const TOP_NAV = [
  { href: "/", label: "홈" },
  { href: "/community", label: "커뮤니티" },
  { href: "/info", label: "정보센터" },
  { href: "/boards/jobs", label: "구인" },
] as const;

export type SidebarIcon =
  | "home"
  | "message"
  | "camera"
  | "briefcase"
  | "help"
  | "heart"
  | "alert"
  | "book"
  | "lightbulb"
  | "calendar"
  | "megaphone"
  | "bell"
  | "shield"
  | "check"
  | "spade"
  | "badge";

export type SidebarItem = NavItem & { icon: SidebarIcon };

export type SidebarGroup = {
  title: string | null;
  items: SidebarItem[];
};

/** 홈 사이드바(시안). 피드 검증용 BOARD_NAV와 분리 */
export const SIDEBAR_NAV: SidebarGroup[] = [
  {
    title: null,
    items: [{ href: "/", label: "홈", hint: "커뮤니티 홈", icon: "home" }],
  },
  {
    title: "커뮤니티",
    items: [
      { href: "/boards/free", label: "자유 게시판", hint: "잡담 · 수다", icon: "message" },
      { href: "/boards/sketch", label: "현장 스케치", hint: "현장 사진", icon: "camera" },
      { href: "/boards/jobs", label: "딜러 구인 · 구직", hint: "구인 허브", icon: "briefcase" },
      { href: "/boards/rules", label: "질문 & 답변", hint: "룰 · 판정", icon: "help" },
      { href: "/issues", label: "사고 · 사건 · 이슈", hint: "현장 이슈", icon: "alert" },
      { href: "/attendance", label: "출석체크", hint: "매일 출석 EXP", icon: "check" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "투표 · 스팟", icon: "spade" },
    ],
  },
  {
    title: "정보센터",
    items: [
      { href: "/info/guide", label: "딜러 가이드", hint: "홀덤 기본 룰", icon: "book" },
      { href: "/practice", label: "딜러 연습", hint: "사이드팟 · 미니멈 레이즈", icon: "lightbulb" },
      { href: "/info/dealers", label: "인증 딜러", hint: "골드 뱃지 딜러", icon: "badge" },
      { href: "/boards/schedule", label: "대회 스케줄", hint: "일자별 · 월별", icon: "calendar" },
      { href: "/boards/official", label: "공식 홍보", hint: "제휴 · 협찬", icon: "megaphone" },
    ],
  },
  {
    title: "기타",
    items: [
      { href: "/shop", label: "마크 상점", hint: "포인트로 마크 구매", icon: "badge" },
      { href: "/notices", label: "공지사항", hint: "운영 공지", icon: "bell" },
      { href: "/advertise", label: "제휴 · 광고", hint: "단가 · 문의", icon: "megaphone" },
      { href: "/terms", label: "운영 정책", hint: "약관", icon: "shield" },
    ],
  },
];

/** 피드 키 연결용 게시판 트리 (사이드바 시안과 별개) */
export const BOARD_NAV: NavGroup[] = [
  {
    title: "대회 스케줄",
    href: "/boards/schedule",
    hint: "일자별 / 월별 일정표",
    accent: "emerald",
    items: [],
  },
  {
    title: "공식 홍보",
    href: "/boards/official",
    hint: "제휴 · 협찬 소식",
    accent: "emerald",
    items: [],
  },
  {
    title: "커뮤니티",
    href: "/attendance",
    hint: "출석부터 핸드리뷰까지",
    accent: "emerald",
    items: [
      { href: "/attendance", label: "출석체크", hint: "매일 출석 EXP" },
      { href: "/boards/rules", label: "질문 & 답변", hint: "룰 · 판정" },
      { href: "/boards/sketch", label: "현장 스케치", hint: "현장 사진" },
      { href: "/boards/free", label: "자유 게시판", hint: "잡담 · 수다" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "투표 · 스팟" },
    ],
  },
  {
    title: "구인 / 구직",
    href: "/boards/jobs/fixed",
    hint: "고정부터 개인 구직",
    accent: "gold",
    items: [
      { href: "/boards/jobs/fixed", label: "고정 직원 구인", hint: "상시 · 고정" },
      { href: "/boards/jobs/apply", label: "지원 딜러 구인", hint: "단기 · 스팟" },
      { href: "/boards/jobs/team", label: "팀 구인", hint: "팀원 모집" },
      { href: "/boards/jobs/urgent", label: "급구 / 대타", hint: "당일 · 긴급" },
      { href: "/boards/jobs/seek", label: "개인 구직", hint: "이력 · 희망 조건" },
    ],
  },
];

export function flattenNavItems(groups: NavGroup[] = BOARD_NAV): NavItem[] {
  return groups.flatMap((group) =>
    group.items.length > 0
      ? group.items
      : [{ href: group.href, label: group.title, hint: group.hint }],
  );
}

export function navItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function navGroupActive(pathname: string, group: NavGroup) {
  if (navItemActive(pathname, group.href)) return true;
  return group.items.some((item) => navItemActive(pathname, item.href));
}

export const BOARD_SLUGS = {
  free: { title: "자유게시판", boardType: "FREE" as const, writeHref: "/boards/free/write" },
  rules: {
    title: "질문 & 답변",
    boardType: "RULE_QA" as const,
    writeHref: "/boards/rules/write",
  },
  sketch: {
    title: "현장 스케치",
    boardType: "SKETCH" as const,
    writeHref: "/boards/sketch/write",
  },
  "hand-review": {
    title: "핸드리뷰",
    boardType: "HAND_REVIEW" as const,
    writeHref: "/boards/hand-review/write",
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
    title: "대회 스케줄",
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
    blurb: "홀덤펍 상시 고정 딜러·스태프 모집",
    kind: "FIXED" as const,
    cta: "구인 등록",
  },
  apply: {
    title: "지원 딜러 구인",
    blurb: "홀덤 단기·스팟 딜러 지원",
    kind: "APPLY" as const,
    cta: "구인 등록",
  },
  team: {
    title: "팀 구인",
    blurb: "홀덤 딜러 팀원 모집",
    kind: "TEAM" as const,
    cta: "구인 등록",
  },
  urgent: {
    title: "급구 / 대타",
    blurb: "홀덤펍 당일·긴급 대타",
    kind: "URGENT" as const,
    cta: "급구 등록",
  },
  seek: {
    title: "개인 구직",
    blurb: "홀덤 딜러·스태프 개인 구직",
    kind: "SEEKING" as const,
    cta: "구직 등록",
  },
} as const;

export const JOB_ALIASES: Record<string, keyof typeof JOB_KINDS> = {
  dealer: "fixed",
  staff: "apply",
  player: "team",
  pickup: "urgent",
  talent: "seek",
};

export function resolveJobKind(kind: string) {
  const mapped = JOB_ALIASES[kind] ?? kind;
  return JOB_KINDS[mapped as keyof typeof JOB_KINDS] ?? null;
}

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  FIXED: "고정 직원 구인",
  APPLY: "지원 딜러 구인",
  TEAM: "팀 구인",
  URGENT: "급구 / 대타",
  SEEKING: "개인 구직",
};

export const WRITE_HINT: Partial<Record<BoardType, string>> = {
  PROMO: "팀·브랜드 공식 홍보, 제휴 및 협찬 소식만 등록합니다. 배너 구좌 1~6과 연동됩니다.",
  SCHEDULE: "관리자가 올립니다. 주간 허브 글이 매주 자동으로 생깁니다.",
  JOBS: "제목은 [지역] 홀덤펍 딜러 구인 형식으로 자동 생성됩니다.",
  FREE: "자유 수다, 잡담, 현장 이야기.",
  RULE_QA: "룰·판정·진행이 맞는지 질문하세요.",
  SKETCH: "현장 사진과 스케치를 공유하세요.",
  HAND_REVIEW:
    "제목 앞에 홀덤 핸드리뷰가 붙습니다. 테이블을 그리고 등록하면 Fold/Check/Call/Raise 투표가 열립니다.",
};
