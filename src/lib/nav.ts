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

// 위쪽 메뉴는 왼쪽 메뉴(SIDEBAR_NAV)와 같은 묶음 · 순서를 씁니다(top-nav.tsx).

export const MOBILE_BOTTOM_NAV = [
  { href: "/", label: "홈", icon: "home" as const, match: "exact" as const },
  { href: "/boards/jobs", label: "구인구직", icon: "briefcase" as const, match: "prefix" as const },
  { href: "/boards/jobs/write", label: "구인등록", icon: "write" as const, match: "write" as const },
  { href: "/community", label: "게시판", icon: "message" as const, match: "boards" as const },
  { href: "/account", label: "내정보", icon: "user" as const, match: "me" as const },
] as const;

/** 왼쪽 메뉴 아이콘: 브랜드 아이콘(오니·동양 테마) 이름 */
export type SidebarIcon = import("@/components/brand/brand-icon").BrandIconName;

export type SidebarItem = NavItem & { icon: SidebarIcon; /** 메뉴 옆 작은 표시(새 기능 등) */ badge?: string };

export type SidebarGroup = {
  title: string | null;
  /** 왼쪽 메뉴 한 줄(묶음)을 누르면 가는 모음 화면 */
  hub?: string;
  /** 묶음 줄 아이콘(브랜드 아이콘 이름) */
  icon?: SidebarIcon;
  /** 메뉴에 없지만 이 묶음에 속하는 주소(앞부분 일치) — 예: 지역별 구인, 약관 */
  match?: string[];
  items: SidebarItem[];
  /** 사이드바에서 접어 둘 수 있는 그룹 */
  collapsible?: boolean;
  /** 처음엔 접어 둠(지금 보는 페이지가 이 그룹 안이면 펼침) */
  closed?: boolean;
};

/** 매장 관리 도구(회원 무료) — 사이드바 · 홀덤 공부 도구 모음에서 같이 씀 */
export const STORE_TOOL_ITEMS: SidebarItem[] = [
  { href: "/tools/rotation", label: "딜러 로테이션", hint: "교대 시간표", icon: "chips" },
  { href: "/tools/board", label: "게임 현황판", hint: "토너먼트 시계 · TV", icon: "lantern" },
  { href: "/tools/shot-clock", label: "샷클락", hint: "플레이어 생각 시간", icon: "lantern" },
  { href: "/tools/seat-draw", label: "싯드로우", hint: "칩 균형 좌석", icon: "cards" },
  { href: "/tools/pay", label: "급여 계산기", hint: "3.3% · 4대보험", icon: "coin" },
  { href: "/tools/practice", label: "팟 계산 연습", hint: "사이드팟 계산기 · 연습 랭킹", icon: "chips", badge: "HOT" },
];

/** 홀덤 공부 메뉴(자주 쓰는 7개 + 전체 보기). 나머지 도구 · 자료는 「홀덤 공부」 첫 화면에 모두 있음 */
export const STUDY_ITEMS: SidebarItem[] = [
  { href: "/info/holdem", label: "홀덤 가이드", hint: "플레이어 전략 · 예시 핸드", icon: "scroll", badge: "NEW" },
  { href: "/info/guide", label: "딜러 가이드", hint: "딜러 실무 · 테이블 룰", icon: "seal" },
  { href: "/study#courses", label: "공부 코스", hint: "입문 · 실력 · 토너먼트 · 딜러 순서대로", icon: "scroll" },
  { href: "/info/push-fold", label: "GTO 푸시폴드 차트", hint: "포지션별 올인 · 콜 범위 · ICM", icon: "cards" },
  { href: "/community/equity", label: "승률 계산기", hint: "내 패 vs 상대 · 스트리트별", icon: "cards" },
  { href: "/quiz", label: "퀴즈", hint: "오늘의 퀴즈 · 푸시폴드 퀴즈", icon: "seal" },
  { href: "/boards/tda", label: "TDA 룰", hint: "토너먼트 공식 룰", icon: "scroll" },
  { href: "/study", label: "계산기 · 자료 전체", hint: "ICM · 레인지 · 족보 · 참고 표 · 용어 · 판정 사례", icon: "scroll" },
];

/** 홀덤 공부 묶음에 드는 주소(메뉴에 없는 도구도 · 위 메뉴 · 방문 통계에서 씀) */
export const STUDY_PATHS = ["/study", "/info/holdem", "/info/guide", "/info/push-fold", "/community/equity", "/info/icm", "/community/hand-ranges", "/community/hand-rankings", "/quiz", "/boards/tda"];

/** 위 메뉴에서 이 주소가 어느 칸인지(홀덤 공부 도구는 주소와 메뉴가 달라서 따로 매핑) */
export function topNavPath(pathname: string) {
  if (STUDY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return "/study";
  return pathname;
}

/**
 * 왼쪽 메뉴: 홈 + 큰 묶음 6줄(최소형). 묶음을 누르면 모음 화면(hub)으로 가고,
 * 지금 보는 페이지가 그 묶음 안이면 아래에 세부 메뉴가 펼쳐집니다.
 */
export const SIDEBAR_NAV: SidebarGroup[] = [
  {
    title: null,
    items: [{ href: "/", label: "홈", hint: "커뮤니티 홈", icon: "torii" }],
  },
  {
    title: "구인구직",
    hub: "/boards/jobs",
    icon: "chips",
    match: ["/boards/jobs", "/jobs/"],
    items: [
      // 지원 딜러 구인이 메인, 급구/대타가 그다음입니다.
      { href: "/boards/jobs/apply", label: "지원 딜러 구인", hint: "단기 · 스팟", icon: "chips" },
      { href: "/boards/jobs/urgent", label: "급구 / 대타", hint: "당일 · 긴급", icon: "flame" },
      { href: "/boards/jobs/tournament", label: "대회 딜러 구인", hint: "대회 · 행사", icon: "lantern" },
      { href: "/boards/jobs/fixed", label: "고정 직원 구인", hint: "상시 · 고정", icon: "noren" },
      { href: "/boards/jobs/team", label: "팀 구인", hint: "팀원 모집", icon: "oni" },
      // 딜러용 · 매장용 바로가기
      { href: "/boards/jobs/slots", label: "날짜별 빈자리", hint: "오늘 · 내일 빈자리 · 알림 받기", icon: "moon" },
      { href: "/boards/jobs/mine", label: "내 공고 관리", hint: "로고 · 마감 · 끌어올리기", icon: "brush" },
    ],
  },
  {
    // 매장 · 대회 운영 도구(샷클락은 로그인 없이, 나머지는 회원 무료)
    title: "매장 관리",
    hub: "/tools",
    icon: "noren",
    items: STORE_TOOL_ITEMS,
  },
  {
    // 가이드 · 무료 공부 · 계산 도구(로그인 없이)
    title: "홀덤 공부",
    hub: "/study",
    icon: "scroll",
    // 메뉴에서 뺀 도구 · 자료도 이 묶음
    match: ["/study", "/info/icm", "/community/hand-ranges", "/community/hand-rankings", "/info/holdem", "/info/guide"],
    items: STUDY_ITEMS,
  },
  {
    // 회원끼리 이야기하는 곳 + 대회 일정 · 룰
    title: "커뮤니티",
    hub: "/community",
    icon: "cloud",
    // 대회 · 정보 모음(/info), 자유게시판 「질문」 탭(/boards/rules), 현장 스케치, 회원 글 목록도 커뮤니티
    match: ["/info", "/boards/rules", "/boards/sketch", "/u/", "/search"],
    items: [
      { href: "/boards/free", label: "자유 게시판", hint: "잡담 · 질문", icon: "cloud" },
      { href: "/boards/hand-review", label: "핸드리뷰", hint: "투표 · 스팟", icon: "cards" },
      { href: "/boards/schedule", label: "대회 캘린더", hint: "일자별 · 월별", icon: "moon" },
    ],
  },
  {
    // 포인트 · 레벨 · 놀이
    title: "포인트 · 놀이",
    hub: "/play",
    icon: "omamori",
    match: ["/i/"],
    items: [
      { href: "/attendance", label: "출석체크", hint: "매일 포인트 · 연속 출석 보너스", icon: "omamori" },
      { href: "/yokai", label: "요괴 마을", hint: "요괴 키우기 · 도감", icon: "lantern" },
      { href: "/games", label: "요괴 오락실", hint: "요괴 오목 · 윷놀이", icon: "cards" },
      { href: "/ranking", label: "랭킹", hint: "레벨 · 수집 · 출석", icon: "pagoda" },
      { href: "/shop", label: "포인트 상점", hint: "포인트로 마크 · 변경권 구매", icon: "coin" },
      { href: "/invite", label: "친구 초대", hint: "친구 첫 출석하면 둘 다 포인트", icon: "coin", badge: "NEW" },
    ],
  },
  {
    // POKA 운영: 공지 · 홍보 · 문의 (운영 정책은 맨 아래 바닥글에)
    title: "POKA",
    hub: "/poka",
    icon: "bell",
    // 공식 홍보 옛 주소(/boards/promo), 운영 · 약관 · 문의 · 인증 뱃지 안내
    match: ["/boards/promo", "/about", "/operator", "/contact", "/terms", "/privacy", "/youth", "/info/dealers"],
    items: [
      { href: "/notices", label: "공지사항", hint: "운영 공지", icon: "bell" },
      { href: "/boards/official", label: "공식 홍보", hint: "제휴 · 협찬", icon: "fan" },
      { href: "/boards/suggestions", label: "건의사항", hint: "비밀글 가능", icon: "brush" },
      { href: "/advertise", label: "제휴 · 광고", hint: "문의하기", icon: "gourd" },
    ],
  },
];

/** 이 주소가 왼쪽 메뉴 어느 묶음인지(모음 화면 또는 세부 메뉴) */
export function sidebarGroupActive(pathname: string, group: SidebarGroup, hint: string | null = null) {
  return group.title != null && navSectionOf(pathname, hint) === group.title;
}

/** 게시글(/posts/…)이 어느 묶음인지: 게시판 종류로 */
export const BOARD_SECTION: Partial<Record<BoardType, string>> = {
  JOBS: "구인구직",
  TALENT: "구인구직",
  PICKUP: "구인구직",
  FREE: "커뮤니티",
  RULE_QA: "커뮤니티",
  SKETCH: "커뮤니티",
  HAND_REVIEW: "커뮤니티",
  ANONYMOUS_REVIEW: "커뮤니티",
  SCHEDULE: "커뮤니티",
  TDA: "커뮤니티",
  EVENT_POSTER: "커뮤니티",
  NOTICE: "POKA",
  PROMO: "POKA",
  OFFICIAL_POSTER: "POKA",
  SUGGESTION: "POKA",
};

function prefixHit(pathname: string, prefix: string) {
  if (prefix.endsWith("/")) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * 이 주소가 왼쪽 · 위쪽 메뉴의 어느 묶음인지(하나만). 메뉴 주소 중 가장 길게 맞는 것이 이깁니다.
 * 예: /community/equity → 홀덤 공부(메뉴 항목), /community → 커뮤니티(모음 화면), /jobs/서울 → 구인구직.
 * hint: 게시글처럼 주소만으로 모를 때 화면이 알려 주는 묶음 이름.
 */
export function navSectionOf(pathname: string, hint: string | null = null): string | null {
  if (hint) return hint;
  let best: { title: string; len: number } | null = null;
  for (const group of SIDEBAR_NAV) {
    if (!group.title) continue;
    const candidates = [
      ...group.items.filter((item) => navItemActive(pathname, item.href)).map((item) => item.href.length + 1000),
      ...(group.hub && pathname === group.hub ? [group.hub.length + 2000] : []),
      ...(group.match ?? []).filter((m) => prefixHit(pathname, m)).map((m) => m.length),
    ];
    for (const len of candidates) if (!best || len > best.len) best = { title: group.title, len };
  }
  return best?.title ?? null;
}

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
      { href: "/boards/free", label: "자유 게시판", hint: "잡담 · 질문" },
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
