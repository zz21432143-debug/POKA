/**
 * 기본 금지어 필터. 관리자 화면의 금지어(DB)와 함께 글·댓글·닉네임·지원 메시지에 적용합니다.
 *
 * - 글자 사이에 특수문자·숫자를 끼워 넣는 우회(씨1발, 씨!발, 씨.발)를 막습니다.
 * - 전각 문자(ｓｅｘ)와 보이지 않는 문자(zero-width)는 정규화한 뒤 검사합니다.
 * - 홀덤 딜러 구인 사이트라 정상 문장을 막지 않도록 일부 단어는 형태를 좁혀 둡니다.
 *   예) 오픈채팅·카톡: 구인 연락처로 쓰므로 막지 않음 / 카지노·슬롯·토토: 도박 광고 형태만 막음
 *       시발점·오피스텔·18시: 예외 처리
 */

export type ProfanityCategory = "abuse" | "adult" | "gambling" | "spam" | "hate" | "impersonation";

export const PROFANITY_LABEL: Record<ProfanityCategory, string> = {
  abuse: "욕설·비속어",
  adult: "음란·성인",
  gambling: "불법 도박·사기·대출",
  spam: "스팸·외부 유도",
  hate: "차별·혐오 표현",
  impersonation: "운영진 사칭",
};

/**
 * 글자 사이에 끼워 넣는 우회 문자(특수문자·숫자) 최대 3개.
 * 공백은 넣지 않습니다. "홍길동씨 발표", "아저씨 발견"이 욕설로 잡히기 때문입니다.
 */
const GAP = "[\\p{P}\\p{S}0-9_]{0,3}";

/** "씨발" → 씨[GAP]발 처럼 글자 사이 우회를 허용하는 패턴 조각 */
function spaced(word: string) {
  return [...word].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(GAP);
}

function rule(words: string[], extra: string[] = []) {
  return new RegExp([...words.map(spaced), ...extra].join("|"), "iu");
}

/** 검사 전에 지워 두는 정상 단어(오탐 방지) */
const SAFE_PHRASES = [
  "시발점",
  "시발역",
  "오피스텔",
  "오피스",
  "씹다",
  "씹어",
  "씹는",
  "씹을",
  "곱씹",
  "오피셜",
  "토토로",
];

/**
 * 기본 금지어(카테고리별). 관리자 페이지 '금지어 관리'에 그대로 보이고, 단어마다 끄고 켤 수 있습니다.
 * impersonation(운영진 사칭)은 닉네임에만 적용합니다.
 */
export const BASE_WORDS: Record<ProfanityCategory, string[]> = {
  abuse: [
    "씨발", "시발", "씨바", "씨팔", "시팔", "씨빨", "십발", "쓰발", "ㅆㅂ", "ㅅㅂ", "ㅆ발",
    "개새끼", "개새기", "개색끼", "개색기", "개세끼", "개쉐끼", "개섀끼", "개새",
    "좆", "좃까", "졷", "씹새", "씹할", "씹팔", "씹년", "씹창", "씹놈", "씹썅",
    "병신", "븅신", "빙신", "병싄", "ㅂㅅ", "ㅄ",
    "느금마", "느금", "니애미", "니미", "니엄마", "엠창", "애미", "애비없",
    "지랄", "ㅈㄹ", "염병", "썅", "썅년", "미친년", "미친놈", "꺼져", "닥쳐", "좆밥",
    "fuck", "shit", "bitch", "fxck", "sibal", "ssibal",
  ],
  adult: [
    "조건만남", "조건만", "출장안마", "출장마사지", "출장샵", "오피", "op사이트", "야동", "야설",
    "성인용품", "휴게텔", "섹파", "섹스", "sex", "porn", "폰섹", "립카페", "키스방", "안마방",
    "유흥업소", "애인대행", "만남어플", "19금방",
  ],
  gambling: [
    "온라인카지노", "카지노사이트", "라이브카지노", "바카라사이트", "온라인바카라", "슬롯사이트", "슬롯게임",
    // "먹튀"는 홀덤펍에서 '계산 안 하고 간 손님' 뜻으로도 써서 사이트 홍보 형태만 막습니다.
    "사설토토", "토토사이트", "스포츠토토", "토토가입", "꽁머니", "먹튀검증", "먹튀사이트", "첫충", "매충",
    "환전보장", "대부업", "급전", "소액결제", "소액결제현금화", "현금화", "작업대출", "내구제",
    "주식리딩", "리딩방", "코인리딩", "무료리딩", "수익보장", "원금보장",
  ],
  spam: ["텔레그램", "텔그", "라인아이디", "라인id", "최저가", "100%증정", "무료증정", "광고문의환영"],
  hate: [
    // "한남"(한남동), "라도"(~라도), "홍어"(음식)는 정상 문장에 많아 혐오 조합만 막습니다.
    "김치녀", "된장녀", "한남충", "꼴페미", "메갈", "워마드", "보슬아치", "냄저", "맘충", "급식충",
    "틀딱", "노인충", "잼민이", "홍어새끼", "홍어족", "전라디언", "경상디언", "짱깨", "짱개", "쪽바리",
    "쪽발이", "깜둥이", "흑형", "똥남아", "조선족새끼", "장애인새끼", "애자", "정신병자", "게이새끼",
    "똥꼬충", "트랜스충", "벌레새끼",
  ],
  impersonation: [
    "admin", "administrator", "moderator", "operator", "official", "system", "sysop", "master",
    "관리자", "운영자", "운영진", "운영팀", "매니저", "공식", "시스템", "어드민", "고객센터", "마스터",
  ],
};

/** 끌 수 없는 고정 패턴(우회 없이 그대로 잡음) */
const FIXED_PATTERNS: Partial<Record<ProfanityCategory, string[]>> = {
  // 숫자 은어. "18"은 18시·18세 오탐이 커서 욕설 조합만 막습니다.
  abuse: ["(?:^|[^0-9])18(?:놈|년|새끼|롬|럼)", "ㅅ\\s*1\\s*ㅂ", "c\\s*8"],
  // 링크 단축·텔레그램 주소
  spam: ["t\\.me\\/", "telegram\\.me", "bit\\.ly", "tinyurl\\.com", "han\\.gl", "me2\\.do", "vo\\.la", "url\\.kr"],
};

export const PROFANITY_CATEGORIES = Object.keys(BASE_WORDS) as ProfanityCategory[];

type Rule = { category: ProfanityCategory; pattern: RegExp };

function buildRules(disabled: ReadonlySet<string>): Rule[] {
  const rules: Rule[] = [];
  for (const category of PROFANITY_CATEGORIES) {
    const words = BASE_WORDS[category].filter((word) => !disabled.has(word));
    const fixed = FIXED_PATTERNS[category] ?? [];
    // 빈 패턴은 모든 글에 걸리므로 만들지 않습니다.
    if (words.length + fixed.length === 0) continue;
    rules.push({ category, pattern: rule(words, fixed) });
  }
  return rules;
}

const DEFAULT_RULES = buildRules(new Set());
let cachedRules: { key: string; rules: Rule[] } = { key: "", rules: DEFAULT_RULES };

/** 관리자가 끈 단어를 뺀 규칙(같은 목록이면 다시 만들지 않음) */
function rulesFor(disabled?: ReadonlySet<string>) {
  if (!disabled || disabled.size === 0) return DEFAULT_RULES;
  const key = [...disabled].sort().join("\n");
  if (cachedRules.key !== key) cachedRules = { key, rules: buildRules(disabled) };
  return cachedRules.rules;
}

/**
 * 비교용 정규화: 전각 영숫자→반각, 소문자, 보이지 않는 문자 제거, 오탐 단어 제거.
 * NFKC는 한글 자모(ㅅㅂ)를 다른 코드로 바꿔 버려서 쓰지 않고, 전각 문자만 직접 바꿉니다.
 */
export function normalizeForFilter(text: string) {
  let out = text
    .normalize("NFC")
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[​-‏⁠﻿­]/g, "");
  for (const safe of SAFE_PHRASES) out = out.split(safe).join(" ");
  return out;
}

export type ProfanityHit = { category: ProfanityCategory; match: string };

/** disabled: 관리자가 끈 기본 금지어 */
export function findProfanity(
  text: string,
  opts: { nickname?: boolean; disabled?: ReadonlySet<string> } = {},
): ProfanityHit | null {
  if (!text) return null;
  const normalized = normalizeForFilter(text);
  for (const { category, pattern } of rulesFor(opts.disabled)) {
    if (category === "impersonation" && !opts.nickname) continue;
    const found = normalized.match(pattern);
    if (found) return { category, match: found[0] };
  }
  return null;
}
