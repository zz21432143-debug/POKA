import type { AiLevel } from "@/lib/omok";
import type { YokaiSpecies } from "@/lib/yokai";

/** 오목 대사: start 시작 · four 내가 4목 · danger 상대가 4목 · win · lose · think(AI 생각 중) */
export type OmokLineKind =
  "start" | "four" | "danger" | "win" | "lose" | "think";

export type OmokOpponent = {
  species: YokaiSpecies;
  stage: number;
  level: AiLevel;
  title: string;
  /** 난이도 이름 */
  tier: string;
  tone: string;
  lines: Record<OmokLineKind, string[]>;
};

/** 요괴 AI 상대 4명(쉬움 · 보통 · 어려움 · 지옥 — 팟 계산 난이도와 같은 이름) */
export const OMOK_OPPONENTS: OmokOpponent[] = [
  {
    species: "dokkaebi",
    stage: 2,
    level: 1,
    title: "장난꾸러기 도깨비",
    tier: "쉬움",
    tone: "#4ade80",
    lines: {
      start: [
        "히히, 나랑 놀자! 방망이 대신 돌로!",
        "오목? 그거 다섯 개 놓는 거 맞지?",
      ],
      think: ["음… 여기? 아니 저기?", "뚝딱뚝딱…"],
      four: ["어? 네 개다! 히히!", "뚝딱! 하나만 더!"],
      danger: ["으앗, 거기 막아야 하나?!", "잠깐잠깐, 그거 반칙 아니지?"],
      win: ["뚝딱! 내가 이겼다~!", "히히, 오늘은 운이 좋네!"],
      lose: ["으앙, 졌다! 한 판 더!", "방망이가 미끄러졌어…"],
    },
  },
  {
    species: "tengu",
    stage: 3,
    level: 2,
    title: "산의 수행자 텐구",
    tier: "보통",
    tone: "#60a5fa",
    lines: {
      start: ["바둑판 위에서도 수행은 계속된다.", "정석대로 상대해 주지."],
      think: ["바람의 흐름을 읽는 중…", "흠."],
      four: ["깃털 하나면 끝이다.", "네 개. 막을 수 있겠나?"],
      danger: ["…날카롭군.", "그 수, 봐 두었다."],
      win: ["수행이 부족하구나. 다시 오너라.", "바람은 내 편이었다."],
      lose: ["훌륭하다. 내 수행이 모자랐군.", "산으로 돌아가 다시 수련하겠다."],
    },
  },
  {
    species: "yeomra",
    stage: 5,
    level: 3,
    title: "저승의 심판관 염라대왕",
    tier: "어려움",
    tone: "#c084fc",
    lines: {
      start: ["저승의 판에 온 것을 환영한다.", "네 수 하나하나를 심판하겠다."],
      think: ["명부를 넘겨 보는 중이다…", "흐음."],
      four: ["판결이 머지않았다.", "네 개. 이제 심판의 시간이다."],
      danger: ["감히 염라 앞에서…!", "그 수는 기록해 두겠다."],
      win: [
        "판결: 패배. 다음 생에 다시 오너라.",
        "저승의 문은 언제나 열려 있다.",
      ],
      lose: ["…이번 판결은 너의 승리다.", "명부에 네 이름을 새겨 두지."],
    },
  },
  {
    species: "gumiho",
    stage: 5,
    level: 4,
    title: "천년 묵은 구미호",
    tier: "지옥",
    tone: "#f87171",
    lines: {
      start: ["후후, 천 년 동안 이 판만 봐 왔단다.", "어디 한번 홀려 볼까?"],
      think: ["꼬리 아홉 개로 수를 세는 중…", "후후…"],
      four: ["어머, 벌써 네 개네?", "어디를 막아도 늦었단다."],
      danger: ["제법이구나…?", "후후, 그 정도로는 안 넘어가."],
      win: [
        "후후, 홀렸지? 처음부터 함정이었단다.",
        "천 년은 더 수련하고 오렴.",
      ],
      lose: ["…이럴 수가. 천 년 만에 처음이야.", "흥, 이번만 봐준 거야."],
    },
  },
];

/** 친구 대전에서 내 대표 요괴가 하는 말(요괴 종류와 상관없이) */
export const PLAYER_LINES: Record<Exclude<OmokLineKind, "think">, string[]> = {
  start: ["잘 부탁해!", "한 판 붙자!", "이번엔 안 봐줘!"],
  four: ["네 개다! 막아 봐!", "하나만 더!", "후후, 보이지?"],
  danger: ["앗, 막아야 해!", "위험해!"],
  win: ["이겼다!", "오늘은 내가 승리!", "한 판 더 할래?"],
  lose: ["으앗, 졌다…", "다음엔 꼭 이긴다!", "잘 뒀어…!"],
};

export function pickOmokLine(list: string[], seed: number) {
  return list[Math.abs(Math.floor(seed)) % list.length] ?? "";
}

/** 훈수에 요괴 말투(앞 · 뒤 한마디) */
const VOICE: Partial<Record<YokaiSpecies, [string, string]>> = {
  dokkaebi: ["히히! ", " 뚝딱!"],
  ingeo: ["뻐끔뻐끔~ ", " 물결처럼 흘러가는 거야."],
  samdugumi: ["세 머리가 다 봤어! ", ""],
  gumiho: ["후후~ ", " 홀렸지?"],
  yeomra: ["판결한다. ", " 명부에 적어 두겠다."],
  tengu: ["흠. ", " 수행이 부족하군."],
  haetae: ["정의의 판정! ", ""],
  hwaryong: ["크아앙! ", " 불타오르네!"],
  seolnyeo: ["차갑게 말하자면, ", ""],
  bakjwigwi: ["끼익~ ", " 밤엔 내가 최강이야."],
  noejeongwi: ["찌릿! ", ""],
  bulgasari: ["와구와구! ", " 다 먹어 버렸다!"],
};
export function yokaiVoice(
  species: YokaiSpecies | null | undefined,
  tip: string,
) {
  const v = species ? VOICE[species] : undefined;
  return v ? `${v[0]}${tip}${v[1]}` : tip;
}
