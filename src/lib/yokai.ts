/**
 * 요괴 마을(개발 중 · 마스터만): 요괴 종류 · 진화 · 포만감 · 하루 밥 횟수 계산.
 * 서버 · 화면 공용(순수 함수만).
 */

export type YokaiSpecies = "dokkaebi" | "ingeo" | "samdugumi" | "noejeongwi" | "nudeogi" | "eodukssini" | "samagwi" | "bulgasari";

export type YokaiDef = {
  name: string;
  /** 속성 표시(색 · 글자) */
  element: { label: string; tone: "fire" | "water" | "illusion" | "thunder" | "wind" | "dark" | "nature" | "metal" };
  /** 고를 때 한 줄 소개 */
  intro: string;
  /** 1~5단계 이름 */
  stages: [string, string, string, string, string];
  /** 스타팅으로 고를 수 있는지 */
  starter?: boolean;
  /** 얻는 방법(도감 안내) */
  how: string;
};

export const YOKAI: Record<YokaiSpecies, YokaiDef> = {
  dokkaebi: {
    name: "도깨비",
    element: { label: "불", tone: "fire" },
    intro: "장난기 가득한 도깨비. 방망이를 휘두르며 천하귀왕이 되는 게 꿈이에요.",
    stages: ["꼬마깨비", "불씨깨비", "방망이깨비", "귀왕깨비", "천하귀왕"],
    starter: true,
    how: "처음 고를 수 있는 요괴",
  },
  ingeo: {
    name: "잉어",
    element: { label: "물", tone: "water" },
    intro: "물결을 거슬러 오르는 잉어. 끝까지 키우면 용으로 승천해요.",
    stages: ["아기잉어", "금지느러미", "용꿈잉어", "등용", "창해청룡"],
    starter: true,
    how: "처음 고를 수 있는 요괴",
  },
  samdugumi: {
    name: "삼두구미",
    element: { label: "환술", tone: "illusion" },
    intro: "자랄수록 머리가 늘어나는 여우. 언젠가 구미호를 만나는 게 꿈이에요.",
    stages: ["세싹여우", "쌍두여우", "삼두여우", "환영구미", "삼면천호"],
    starter: true,
    how: "처음 고를 수 있는 요괴",
  },
  noejeongwi: {
    name: "뇌전귀",
    element: { label: "번개", tone: "thunder" },
    intro: "귀와 꼬리에 번개를 모으는 토끼 요괴.",
    stages: ["찌릿콩", "번개토끼", "뇌전수", "천둥귀왕", "천뢰신수"],
    how: "급구 공고에 지원 · 등록하면 찾아와요",
  },
  nudeogi: {
    name: "누덕이",
    element: { label: "바람", tone: "wind" },
    intro: "삿갓 쓰고 바람 따라 떠도는 이야기꾼 요괴.",
    stages: ["먼지령", "솔바람귀", "풍익귀", "폭풍나그네", "천공의 풍랑"],
    how: "자유게시판에서 이야기를 나누면 찾아와요",
  },
  eodukssini: {
    name: "어둑시니",
    element: { label: "어둠", tone: "dark" },
    intro: "바라볼수록 커지는 어둠의 요괴.",
    stages: ["그늘콩", "어둑이", "밤그림자", "거대암영", "심연의 어둑시니"],
    how: "핸드리뷰에 글을 쓰거나 투표하면 찾아와요",
  },
  samagwi: {
    name: "사마귀",
    element: { label: "자연", tone: "nature" },
    intro: "날카로운 낫 팔을 가진 숲의 무사.",
    stages: ["풀잎낫", "잎새검객", "청낫무사", "녹림장군", "천엽검성"],
    how: "댓글을 많이 남기면 찾아와요",
  },
  bulgasari: {
    name: "불가사리",
    element: { label: "쇠", tone: "metal" },
    intro: "쇳조각과 칩을 삼키며 자라는 별 모양 요괴.",
    stages: ["쇳가루", "쇠뭉치", "철갑별", "강철포식자", "불멸의 불가사리"],
    how: "팟 계산 연습을 많이 하면 찾아와요",
  },
};

export const YOKAI_ORDER = Object.keys(YOKAI) as YokaiSpecies[];
export const STARTERS = YOKAI_ORDER.filter((s) => YOKAI[s].starter);
export const isSpecies = (v: unknown): v is YokaiSpecies => typeof v === "string" && v in YOKAI;
export const yokaiImage = (species: YokaiSpecies, stage: number) => `/yokai/${species}-${Math.min(5, Math.max(1, stage))}.webp`;

/** 단계별 필요한 누적 경험치(1단계 0 → 5단계 1500) */
export const STAGE_EXP = [0, 100, 300, 700, 1500] as const;
export function stageForExp(exp: number) {
  let stage = 1;
  STAGE_EXP.forEach((need, i) => {
    if (exp >= need) stage = i + 1;
  });
  return stage;
}
/** 다음 단계까지 진행도(5단계면 null) */
export function nextStageProgress(exp: number) {
  const stage = stageForExp(exp);
  if (stage >= 5) return null;
  const from = STAGE_EXP[stage - 1];
  const to = STAGE_EXP[stage];
  return { stage, have: exp - from, need: to - from, to };
}

/** 밥 한 번: 경험치 · 포만감 · 친밀도 */
export const FEED = { exp: 20, fullness: 25, affection: 3 } as const;
/** 쓰다듬기: 하루 PET_MAX번, 친밀도 +1 */
export const PET_MAX = 5;
/** 포만감은 한 시간에 FULLNESS_DECAY씩 줄어듦(0 밑으로는 안 내려감 · 죽지 않음) */
export const FULLNESS_DECAY = 3;

export function fullnessNow(stored: number, at: Date, now = new Date()) {
  const hours = Math.max(0, (now.getTime() - at.getTime()) / 3_600_000);
  return Math.max(0, Math.min(100, Math.round(stored - hours * FULLNESS_DECAY)));
}

/** 오늘 밥 횟수: 기본 1 + 출석 · 퀴즈 정답 · 글이나 댓글 각 1 */
export type FeedSources = { attended: boolean; quiz: boolean; wrote: boolean };
export function feedsAllowed(src: FeedSources) {
  return 1 + Number(src.attended) + Number(src.quiz) + Number(src.wrote);
}

/** 기분(말풍선) */
export function moodLine(input: { name: string; fullness: number; affection: number; feedsLeft: number; src: FeedSources }) {
  if (input.fullness < 20) return "배고파… 밥 주세요 🍙";
  if (input.feedsLeft > 0 && !input.src.attended) return "오늘 출석하면 밥이 하나 더 생겨요!";
  if (input.feedsLeft > 0) return `밥이 ${input.feedsLeft}번 남았어요. 냠냠 준비 완료!`;
  if (!input.src.quiz) return "오늘의 퀴즈를 맞히면 밥을 하나 더 받을 수 있어요 🧩";
  if (input.affection >= 80) return "언제나 같이 있어 줘서 고마워요 💕";
  if (input.fullness >= 80) return "배불러~ 오늘도 최고야!";
  return "내일 또 놀아 줄 거죠?";
}
