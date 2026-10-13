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
  { href: "/boards/jobs", label: "구인구직" },
  { href: "/community", label: "커뮤니티" },
  { href: "/info", label: "정보센터" },
  { href: "/boards/rules", label: "질문" },
] as const;

export const MOBILE_BOTTOM_NAV = [
  { href: "/", label: "홈", icon: "home" as const, match: "exact" as const },
  { href: "/boards/jobs", label: "구인구직", icon: "briefcase" as const, match: "prefix" as const },
  { href: "/boards/jobs/write", label: "구인등록", icon: "write" as const, match: "write" as const },
  { href: "/community", label: "게시판", icon: "message" as const, match: "boards" as const },
  { href: "/account", label: "내정보", icon: "user" as const, match: "me" as const },
] as const;

/** 왼쪽 메뉴 아이콘: 브랜드 아이콘(오니·동양 테마) 이름 */
export type SidebarIcon = import("@/components/brand/brand-icon").BrandIconName;

export type SidebarItem = NavItem & { icon: SidebarIcon };

export type SidebarGroup = {
  title: string | null;
  items: SidebarItem[];
  /** 사이드바에서 접어 둘 수 있는 그룹. 처음에는 펼친 상태로 보입니다. */
  collapsible?: boolean;
};

/** 홈 사이드바(시안). 피드 검증용 BOARD_NAV와 분리 */
export const SIDEBAR_NAV: SidebarGroup[] = [
  {
    title: null,
    items: [{ href: "/", label: "홈", hint: "커뮤니티 홈", icon: "torii" }],
  },
  {
    title: "구인구직",
    items: [
      // 지원 딜러 구인이 메인, 급구/대타가 그다음입니다.
      { href: "/boards/jobs/apply", label: "지원 딜러 구인", hint: "단기 · 스팟", icon: "chips" },
      { href: "/boards/jobs/tournament", label: "대회 딜러 구인", hint: "대회 · 행사", icon: "lantern" },
      { href: "/boards/jobs/urgent", label: "급구 / 대타", hint: "당일 · 긴급", icon: "flame" },
      { href: "/boards/jobs/fixed", label: "고정 직원 구인", hint: "상시 · 고정", icon: "noren" },
      { href: "/boards/jobs/team", label: "팀 구인", hint: "팀원 모집", icon: "oni" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { href: "/attendance", label: "출석체크", hint: "매일 포인트 · 연속 출석 보너스", icon: "omamori" },
      { href: "/boards/free", label: "자유 게시판", hint: "잡담 · 질문 · 현장 스케치", icon: "cloud" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "투표 · 스팟", icon: "cards" },
    ],
  },
  {
    title: "정보센터",
    collapsible: true,
    items: [
      { href: "/boards/schedule", label: "대회 캘린더", hint: "일자별 · 월별", icon: "moon" },
      { href: "/boards/official", label: "공식 홍보", hint: "제휴 · 협찬", icon: "fan" },
      { href: "/boards/tda", label: "TDA 룰", hint: "토너먼트 공식 룰", icon: "scroll" },
    ],
  },
  {
    // 로그인한 회원 누구나 씁니다(로테이션은 계정마다 따로).
    title: "딜러 툴",
    collapsible: true,
    items: [
      { href: "/tools/rotation", label: "딜러 로테이션", hint: "교대 시간표", icon: "chips" },
      { href: "/tools/seat-draw", label: "싯드로우", hint: "칩 균형 좌석", icon: "cards" },
      { href: "/tools/pay", label: "급여 계산기", hint: "3.3% · 4대보험", icon: "coin" },
      { href: "/tools/practice", label: "딜러 연습장", hint: "팟 계산 · 사이드팟", icon: "omamori" },
    ],
  },
  {
    title: "기타",
    collapsible: true,
    items: [
      { href: "/shop", label: "마크 상점", hint: "포인트로 마크 구매", icon: "coin" },
      { href: "/ranking", label: "랭킹", hint: "레벨 · 수집 · 출석", icon: "pagoda" },
      { href: "/notices", label: "공지사항", hint: "운영 공지", icon: "bell" },
      { href: "/boards/suggestions", label: "건의사항", hint: "비밀글 가능", icon: "brush" },
      { href: "/advertise", label: "제휴 · 광고", hint: "문의하기", icon: "gourd" },
      { href: "/terms", label: "운영 정책", hint: "약관", icon: "seal" },
    ],
  },
];

/** 피드 키 연결용 게시판 트리 (사이드바 시안과 별개) */
export const BOARD_NAV: NavGroup[] = [
  {
    title: "구인 / 구직",
    href: "/boards/jobs/apply",
    hint: "지원 딜러 · 급구 · 고정 · 팀",
    accent: "gold",
    items: [
      { href: "/boards/jobs/apply", label: "지원 딜러 구인", hint: "단기 · 스팟" },
      { href: "/boards/jobs/tournament", label: "대회 딜러 구인", hint: "대회 · 행사" },
      { href: "/boards/jobs/urgent", label: "급구 / 대타", hint: "당일 · 긴급" },
      { href: "/boards/jobs/fixed", label: "고정 직원 구인", hint: "상시 · 고정" },
      { href: "/boards/jobs/team", label: "팀 구인", hint: "팀원 모집" },
    ],
  },
  {
    title: "대회 캘린더",
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
    href: "/community",
    hint: "출석부터 핸드리뷰까지",
    accent: "emerald",
    items: [
      { href: "/attendance", label: "출석체크", hint: "매일 출석 EXP" },
      { href: "/boards/free", label: "자유 게시판", hint: "잡담 · 질문 · 현장 스케치" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "투표 · 스팟" },
      { href: "/boards/suggestions", label: "건의사항", hint: "비밀글 가능" },
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

export function mobileNavActive(
  pathname: string,
  item: (typeof MOBILE_BOTTOM_NAV)[number],
) {
  if (item.match === "exact") return pathname === "/";
  if (item.match === "write") return pathname.includes("/write");
  if (item.match === "me") {
    return (
      pathname === "/me" ||
      pathname === "/account" ||
      pathname.startsWith("/account/") ||
      pathname === "/login" ||
      pathname.startsWith("/u/") ||
      pathname === "/notifications"
    );
  }
  if (item.match === "prefix") {
    if (pathname.includes("/write")) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  if (pathname.startsWith("/boards/jobs")) return false;
  if (pathname.includes("/write")) return false;
  return (
    pathname === "/community" ||
    pathname.startsWith("/boards") ||
    pathname.startsWith("/posts/") ||
    pathname === "/attendance"
  );
}

export function navItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
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
    masterOnly: true,
  },
  promo: {
    title: "공식 홍보",
    boardType: "PROMO" as const,
    writeHref: "/boards/official/write",
    gallery: true,
    masterOnly: true,
  },
  schedule: {
    title: "대회 캘린더",
    boardType: "SCHEDULE" as const,
    writeHref: "/boards/schedule/write",
    calendar: true,
    masterOnly: true,
  },
  tda: {
    title: "TDA 룰",
    boardType: "TDA" as const,
    writeHref: "/boards/tda/write",
    masterOnly: true,
  },
  suggestions: {
    title: "건의사항",
    boardType: "SUGGESTION" as const,
    writeHref: "/boards/suggestions/write",
  },
} as const;

export type BoardSlug = keyof typeof BOARD_SLUGS;

export function resolveBoardSlug(slug: string) {
  return BOARD_SLUGS[slug as BoardSlug] ?? null;
}

/**
 * 순서대로 분류 칩·작성 선택지에 나옵니다. 지원 딜러 구인이 메인, 급구/대타가 그다음입니다.
 * 개인 구직(SEEKING)은 운영을 종료해 여기 없습니다. 예전 글은 DB에만 남습니다.
 */
export const JOB_KINDS = {
  apply: {
    title: "지원 딜러 구인",
    blurb: "홀덤 단기·스팟 딜러 지원",
    kind: "APPLY" as const,
    cta: "구인 등록",
  },
  tournament: {
    title: "대회 딜러 구인",
    blurb: "홀덤 대회·행사 딜러 모집",
    kind: "TOURNAMENT" as const,
    cta: "대회 구인 등록",
  },
  urgent: {
    title: "급구 / 대타",
    blurb: "홀덤펍 당일·긴급 대타",
    kind: "URGENT" as const,
    cta: "급구 등록",
  },
  fixed: {
    title: "고정 직원 구인",
    blurb: "홀덤펍 상시 고정 딜러·스태프 모집",
    kind: "FIXED" as const,
    cta: "구인 등록",
  },
  team: {
    title: "팀 구인",
    blurb: "홀덤 딜러 팀원 모집",
    kind: "TEAM" as const,
    cta: "구인 등록",
  },
} as const;

export const JOB_ALIASES: Record<string, keyof typeof JOB_KINDS> = {
  dealer: "fixed",
  staff: "apply",
  player: "team",
  pickup: "urgent",
};

export function resolveJobKind(kind: string) {
  const mapped = JOB_ALIASES[kind] ?? kind;
  return JOB_KINDS[mapped as keyof typeof JOB_KINDS] ?? null;
}

const JOB_KIND_SLUG: Record<JobKind, string> = {
  FIXED: "fixed",
  APPLY: "apply",
  TOURNAMENT: "tournament",
  TEAM: "team",
  URGENT: "urgent",
  SEEKING: "seek",
};

const BOARD_LIST_HREF: Partial<Record<BoardType, string>> = {
  FREE: "/boards/free",
  RULE_QA: "/boards/rules",
  SKETCH: "/boards/sketch",
  HAND_REVIEW: "/boards/hand-review",
  JOBS: "/boards/jobs",
  PROMO: "/boards/official",
  SCHEDULE: "/boards/schedule",
  NOTICE: "/notices",
  SUGGESTION: "/boards/suggestions",
  TDA: "/boards/tda",
};

export function boardListHref(boardType: BoardType, jobKind?: JobKind | null) {
  // 개인 구직 게시판은 없어졌으므로 예전 구직 글은 구인구직 홈으로 돌아갑니다.
  if (boardType === "JOBS" && jobKind && jobKind !== "SEEKING") return `/boards/jobs/${JOB_KIND_SLUG[jobKind]}`;
  return BOARD_LIST_HREF[boardType] ?? "/community";
}

export const JOB_KIND_LABEL: Record<JobKind, string> = {
  FIXED: "고정 직원 구인",
  APPLY: "지원 딜러 구인",
  TOURNAMENT: "대회 딜러 구인",
  TEAM: "팀 구인",
  URGENT: "급구 / 대타",
  SEEKING: "개인 구직",
};

export const WRITE_HINT: Partial<Record<BoardType, string>> = {
  PROMO: "마스터만 올립니다. 팀·브랜드 공식 홍보, 제휴 및 협찬 소식. 배너 구좌 1~6과 연동됩니다.",
  SCHEDULE: "마스터만 올립니다. 주간 허브 글이 매주 자동으로 생깁니다.",
  NOTICE: "마스터만 올리는 운영 공지입니다.",
  TDA: "POKA 공식 계정만 올립니다. TDA 룰 조항을 번호와 함께 정리해 주세요.",
  JOBS: "제목은 [지역] 상호명 구인 형식으로 자동 생성됩니다.",
  FREE: "자유 수다, 잡담, 현장 이야기.",
  RULE_QA: "룰·판정·진행이 맞는지 질문하세요.",
  SKETCH: "현장 사진과 스케치를 공유하세요.",
  HAND_REVIEW:
    "제목 앞에 홀덤 핸드리뷰가 붙습니다. 테이블을 그리고 등록하면 폴드/체크/콜/레이즈 투표가 열립니다.",
  SUGGESTION: "운영 개선 건의. 비밀글을 켜면 비밀번호(4자리 이상)가 필요합니다. 작성자와 관리자는 바로 볼 수 있습니다.",
};
