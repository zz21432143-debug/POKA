import type { YokaiSpecies } from "@/lib/yokai";

/** 윷놀이 잡기 도발 멘트(요괴마다 말투 몇 개 + 공용) */
const COMMON = [
  "어딜 감히? 잘 가라구~!",
  "크하하! 멍석 밖은 위험해!",
  "뚝배기 깨고 처음부터 다시 출발!",
  "출발점에서 다시 만나~ 메롱!",
  "길 막지 마시고요~ 처음부터 다시!",
  "앗, 미안~ 발이 미끄러졌네? 히히",
  "한 번 더 던진다! 넌 집에 가고!",
];

const BY_SPECIES: Partial<Record<YokaiSpecies, string[]>> = {
  dokkaebi: ["방망이 한 방이면 끝이지! 뚝딱~", "금 나와라 뚝딱! 넌 집으로 뚝딱!", "도깨비 앞에서 까불면 혼난다구!"],
  ingeo: ["물살에 휩쓸려 떠내려가라~ 첨벙!", "용문은 내가 먼저 넘는다!", "뻐끔뻐끔~ 출발점까지 헤엄쳐 가!"],
  samdugumi: ["머리 셋이 다 봤다구~ 딱 걸렸어!", "여우한테 홀렸지? 처음부터 다시~", "꼬리 하나로 휙! 잘 가~"],
  nudeogi: ["바람 따라 훨훨~ 출발점까지 날아가!", "삿갓 아래로 쏙~ 넌 처음부터!"],
  samagwi: ["낫 한 번이면 정리 끝!", "풀숲에 숨어 있었지롱~ 싹둑!"],
  eodukssini: ["어둠 속에서 덥석! 몰랐지?", "볼수록 커지는 나를 못 봤구나~"],
  noejeongwi: ["찌릿! 번개 맞고 출발점으로~", "번쩍 하는 사이에 끝났어!"],
  bulgasari: ["와구와구~ 칩처럼 삼켜 버렸다!", "쇠도 씹어 먹는데 너쯤이야!"],
};

/** 잡은 요괴 말투로 도발 한 줄(같은 판이면 같은 멘트) */
export function yutTaunt(species: YokaiSpecies | null | undefined, seed: number) {
  const own = (species && BY_SPECIES[species]) || [];
  const pool = [...own, ...own, ...COMMON];
  return pool[Math.abs(Math.floor(seed)) % pool.length];
}
