/**
 * 요괴 마을(개발 중 · 마스터만): 요괴 종류 · 진화 · 포만감 · 하루 밥 횟수 계산.
 * 서버 · 화면 공용(순수 함수만).
 */

export type YokaiRarity = "starter" | "common" | "rare" | "hero" | "legend";
export const RARITY_LABEL: Record<YokaiRarity, string> = { starter: "시작", common: "일반", rare: "희귀", hero: "영웅", legend: "전설" };
export const RARITY_ORDER: YokaiRarity[] = ["starter", "common", "rare", "hero", "legend"];

export type YokaiTone =
  | "fire"
  | "water"
  | "illusion"
  | "thunder"
  | "wind"
  | "dark"
  | "nature"
  | "metal"
  | "ice"
  | "seer"
  | "gold"
  | "blood"
  | "light"
  | "seal"
  | "earth"
  | "sky"
  | "justice"
  | "guard"
  | "might"
  | "underworld";

export type YokaiDef = {
  name: string;
  /** 등급: 시작 · 일반 · 희귀 · 영웅(은테) · 전설(금테) */
  rarity: YokaiRarity;
  /** 속성 표시(색 · 글자) */
  element: { label: string; tone: YokaiTone };
  /** 한 줄 소개 */
  intro: string;
  /** 1~5단계 이름 */
  stages: [string, string, string, string, string];
  /** 얻는 방법(도감 안내) */
  how: string;
};

const START = "처음 고를 수 있는 요괴";

// 객체 순서 = 도감 순서(등급별)

export const YOKAI = {
  // ── 시작
  dokkaebi: { name: "도깨비", rarity: "starter", element: { label: "불", tone: "fire" }, intro: "장난기 가득한 도깨비. 방망이를 휘두르며 천하귀왕이 되는 게 꿈이에요.", stages: ["꼬마깨비", "불씨깨비", "방망이깨비", "귀왕깨비", "천하귀왕"], how: START },
  ingeo: { name: "잉어", rarity: "starter", element: { label: "물", tone: "water" }, intro: "물결을 거슬러 오르는 잉어. 끝까지 키우면 용으로 승천해요.", stages: ["아기잉어", "금지느러미", "용꿈잉어", "등용", "창해청룡"], how: START },
  samdugumi: { name: "삼두구미", rarity: "starter", element: { label: "환술", tone: "illusion" }, intro: "자랄수록 머리가 늘어나는 여우. 언젠가 구미호를 만나는 게 꿈이에요.", stages: ["세싹여우", "쌍두여우", "삼두여우", "환영구미", "삼면천호"], how: START },
  // ── 일반
  nudeogi: { name: "누덕이", rarity: "common", element: { label: "바람", tone: "wind" }, intro: "삿갓 쓰고 바람 따라 떠도는 이야기꾼 요괴.", stages: ["먼지령", "솔바람귀", "풍익귀", "폭풍나그네", "천공의 풍랑"], how: "자유게시판에 글 · 댓글을 20개 쓰면 찾아와요" },
  samagwi: { name: "사마귀", rarity: "common", element: { label: "자연", tone: "nature" }, intro: "날카로운 낫 팔을 가진 숲의 무사.", stages: ["풀잎낫", "잎새검객", "청낫무사", "녹림장군", "천엽검성"], how: "댓글을 50개 남기면 찾아와요" },
  eodukssini: { name: "어둑시니", rarity: "common", element: { label: "어둠", tone: "dark" }, intro: "바라볼수록 커지는 어둠의 요괴.", stages: ["그늘콩", "어둑이", "밤그림자", "거대암영", "심연의 어둑시니"], how: "핸드리뷰에 글을 쓰거나 투표를 10번 하면 찾아와요" },
  noejeongwi: { name: "뇌전귀", rarity: "common", element: { label: "번개", tone: "thunder" }, intro: "귀와 꼬리에 번개를 모으는 토끼 요괴.", stages: ["찌릿콩", "번개토끼", "뇌전수", "천둥귀왕", "천뢰신수"], how: "급구 공고에 지원하거나 급구를 올리면 찾아와요" },
  bulgasari: { name: "불가사리", rarity: "common", element: { label: "쇠", tone: "metal" }, intro: "쇳조각과 칩을 삼키며 자라는 별 모양 요괴.", stages: ["쇳가루", "쇠뭉치", "철갑별", "강철포식자", "불멸의 불가사리"], how: "팟 계산 연습을 50번 하면 찾아와요" },
  hwaryong: { name: "화룡", rarity: "common", element: { label: "불", tone: "fire" }, intro: "불을 먹고 자라는 용. 분노할수록 더 뜨거워져요.", stages: ["불씨룡", "홍염룡", "작열룡", "폭염룡", "태양화룡"], how: "결과 이미지를 10번 공유하면 찾아와요" },
  bakjwigwi: { name: "박쥐귀", rarity: "common", element: { label: "밤", tone: "blood" }, intro: "붉은 달이 뜨는 밤에 깨어나는 박쥐 요괴.", stages: ["밤박쥐", "피빛박쥐", "야월귀", "혈월군주", "영원의 밤군주"], how: "새벽(0~5시)에 출석을 7번 하면 찾아와요" },
  deungbulgwi: { name: "등불귀", rarity: "common", element: { label: "빛", tone: "light" }, intro: "매장을 밝히는 한지 초롱 요괴. 혀를 쏙 내밀고 길을 비춰 줘요.", stages: ["반딧불령", "혼불등", "길잡이귀", "백귀등왕", "황천의 등불"], how: "매장 관리 도구(게임 현황판 · 딜러 로테이션)를 만들면 찾아와요" },
  // ── 희귀
  keunnuni: { name: "큰눈이", rarity: "rare", element: { label: "감지", tone: "seer" }, intro: "모든 것을 꿰뚫어 보는 커다란 외눈 요괴.", stages: ["눈알콩", "외눈도깨비", "천리안귀", "만안귀왕", "진실을 보는 자"], how: "오늘의 퀴즈를 14일 연속 맞히면 찾아와요" },
  seolnyeo: { name: "설녀", rarity: "rare", element: { label: "얼음", tone: "ice" }, intro: "차가운 눈 속에 따뜻한 마음을 품은 눈의 여인.", stages: ["눈송이령", "설꽃이", "빙결무희", "설산귀후", "만년설의 여왕"], how: "출석을 30일 채우면 찾아와요" },
  tamrang: { name: "탐랑", rarity: "rare", element: { label: "황금", tone: "gold" }, intro: "금화를 모으며 자라는 욕심 많은 황금 너구리.", stages: ["금콩너구리", "동전너구리", "금화탐랑", "보물귀왕", "만복탐랑"], how: "포인트를 모두 20,000P 받으면(쓴 것과 관계없이) 찾아와요" },
  yacha: { name: "야차", rarity: "rare", element: { label: "분노", tone: "blood" }, intro: "흰 가면 뒤에 불꽃 같은 승부욕을 숨긴 창의 귀신 무사.", stages: ["가면동자", "창야차", "홍염야차", "분노귀장", "천벌야차왕"], how: "주간 경험치 TOP 3에 들면 찾아와요" },
  gangcheori: { name: "강철이", rarity: "rare", element: { label: "강철", tone: "metal" }, intro: "강철 비늘로 몸을 두른 단단한 갑옷 드래곤.", stages: ["쇠비늘", "철갑도마뱀", "강철수", "강철룡", "재앙의 강철룡"], how: "레벨 40을 달성하면 찾아와요" },
  dueoksini: { name: "두억시니", rarity: "rare", element: { label: "괴력", tone: "might" }, intro: "거대한 몽둥이를 든 도깨비 일족의 수장.", stages: ["꼬마두억", "몽둥이두억", "염주거귀", "두억대장", "도깨비 대왕"], how: "도깨비를 5단계까지 키우면 찾아와요" },
  sinroksu: { name: "신록수", rarity: "rare", element: { label: "자연", tone: "nature" }, intro: "뿔이 빛나는 나무로 자라는 숲과 빛의 신수.", stages: ["새싹사슴", "영각록", "월광록", "신수백록", "천계의 녹왕"], how: "내 글 · 댓글이 추천을 50개 받으면 찾아와요" },
  horibyeonggwi: { name: "호리병귀", rarity: "rare", element: { label: "봉인", tone: "seal" }, intro: "요괴를 봉인하는 호리병 속 꼬마 도깨비. 도감지기예요.", stages: ["빈병령", "요기병", "백귀호리", "봉인대호", "백팔귀의 그릇"], how: "도감에 요괴를 10종 모으면 찾아와요" },
  // ── 영웅(은테)
  sacheonwang: { name: "사천왕", rarity: "hero", element: { label: "수호", tone: "guard" }, intro: "동서남북 네 보물을 하나씩 모으는 천계의 수호 무장.", stages: ["수호콩", "방위수호", "사방장군", "사천왕", "천계수문장"], how: "월간 칭호를 3번 받으면 찾아와요" },
  tengu: { name: "텐구", rarity: "hero", element: { label: "하늘", tone: "sky" }, intro: "깊은 산에서 무술과 지혜를 가르치는 까마귀 수행자.", stages: ["아기까마귀", "깃부채귀", "산수행자", "흑익천구", "대천구"], how: "홀덤 공부 도구를 50일 쓰면 찾아와요" },
  amseokgwi: { name: "암석귀", rarity: "hero", element: { label: "대지", tone: "earth" }, intro: "등에 산을 짊어지고 천천히, 그러나 끝까지 걷는 거북.", stages: ["돌멩이귀", "바위등껍질", "철벽암귀", "산맥거북", "태산현무"], how: "출석을 100일 채우면 찾아와요" },
  haetae: { name: "해태", rarity: "hero", element: { label: "정의", tone: "justice" }, intro: "옳고 그름을 가려 궁궐을 지키는 정의의 신수.", stages: ["아기해태", "방울해태", "수문해태", "정의의 해태", "천법수 해치"], how: "TDA 룰 OX 퀴즈를 그날 10번 맞히면 찾아와요(일주일에 한 번 나와요)" },
  // ── 전설(금테)
  gumiho: { name: "구미호", rarity: "legend", element: { label: "여우불", tone: "illusion" }, intro: "천 년을 묵어 아홉 꼬리를 얻은 전설의 여우.", stages: ["여우령", "화미호", "삼미호", "칠미호", "구미천호"], how: "「아홉 꼬리의 시련」 업적 9개를 모두 이루면 찾아와요" },
  yeomra: { name: "염라대왕", rarity: "legend", element: { label: "저승", tone: "underworld" }, intro: "저승의 명부를 다스리는 심판의 왕.", stages: ["저승콩", "명부사자", "판결귀", "염라대왕", "명부의 지배자"], how: "「저승의 심판」 도감에 영웅 1종 · 희귀 4종을 모으면 찾아와요" },
} satisfies Record<string, YokaiDef>;

export type YokaiSpecies = keyof typeof YOKAI;

export const YOKAI_ORDER = Object.keys(YOKAI) as YokaiSpecies[];
export const STARTERS = YOKAI_ORDER.filter((s) => YOKAI[s].rarity === "starter");
export const isSpecies = (v: unknown): v is YokaiSpecies => typeof v === "string" && v in YOKAI;
export const yokaiImage = (species: YokaiSpecies, stage: number) => `/yokai/${species}-${Math.min(5, Math.max(1, stage))}.webp`;

/** 단계별 필요한 누적 경험치(1단계 0 → 5단계 2500 · 밥 하루 3~4번이면 최종 진화까지 1~1.5달) */
export const STAGE_EXP = [0, 150, 500, 1200, 2500] as const;
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
export const FEED = { exp: 20, fullness: 20, affection: 3 } as const;
/** 포만감이 이 값 이상이면 배불러서 안 먹음 */
export const FULL_LIMIT = 80;
/** 포만감은 한 시간에 FULLNESS_DECAY씩 줄어듦(0 밑으로는 안 내려감 · 죽지 않음) */
export const FULLNESS_DECAY = 5;
/** 쓰다듬기: 요괴마다 하루 PET_MAX번, 한 번 하면 PET_COOLDOWN_MIN분 쉬어야 함 · 친밀도 +1 */
export const PET_MAX = 5;
export const PET_COOLDOWN_MIN = 60;

export function fullnessNow(stored: number, at: Date, now = new Date()) {
  const hours = Math.max(0, (now.getTime() - at.getTime()) / 3_600_000);
  return Math.max(0, Math.min(100, Math.round(stored - hours * FULLNESS_DECAY)));
}

/** 배불러서 못 먹을 때: 다시 먹을 수 있는 시각(지금 먹을 수 있으면 null) */
export function nextFeedTime(fullness: number, now = new Date()) {
  if (fullness < FULL_LIMIT) return null;
  const hours = (fullness - FULL_LIMIT + 1) / FULLNESS_DECAY;
  return new Date(now.getTime() + Math.ceil(hours * 60) * 60_000);
}

/** 쓰다듬기 쉬는 중이면 다시 할 수 있는 시각 */
export function nextPetTime(pettedAt: Date | null, now = new Date()) {
  if (!pettedAt) return null;
  const at = new Date(pettedAt.getTime() + PET_COOLDOWN_MIN * 60_000);
  return at > now ? at : null;
}

/** "1시간 5분" · "12분" · "1분 미만" */
export function waitText(until: Date, now = new Date()) {
  const min = Math.ceil((until.getTime() - now.getTime()) / 60_000);
  if (min <= 0) return "곧";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}시간 ${m}분` : `${h}시간`) : `${m}분`;
}

/** 오늘 밥 횟수: 기본 1 + 출석 · 퀴즈 정답 · 글이나 댓글 각 1 */
export type FeedSources = { attended: boolean; quiz: boolean; wrote: boolean };
export function feedsAllowed(src: FeedSources) {
  return 1 + Number(src.attended) + Number(src.quiz) + Number(src.wrote);
}

/** 기분(말풍선) */
export function moodLine(input: { name: string; fullness: number; affection: number; feedsLeft: number; src: FeedSources }) {
  if (input.fullness < 20) return "배고파… 밥 주세요 🍙";
  if (input.fullness >= FULL_LIMIT) return "배불러~ 조금 있다가 또 먹을래요 😋";
  if (input.feedsLeft > 0 && !input.src.attended) return "오늘 출석하면 밥이 하나 더 생겨요!";
  if (input.feedsLeft > 0) return `밥이 ${input.feedsLeft}번 남았어요. 냠냠 준비 완료!`;
  if (!input.src.quiz) return "오늘의 퀴즈를 맞히면 밥을 하나 더 받을 수 있어요 🧩";
  if (input.affection >= 80) return "언제나 같이 있어 줘서 고마워요 💕";
  return "내일 또 놀아 줄 거죠?";
}

/** 요괴 마을 배경(포인트로 바로 사기 · 뽑기 없음). 전설 요괴는 전용 배경이 먼저 */
export const YOKAI_BACKGROUNDS = {
  default: { name: "등불 마당", price: 0, css: "radial-gradient(circle at 50% 70%, rgba(201,162,92,.18), transparent 60%), linear-gradient(#22150f, #0d0907)" },
  moon: { name: "달밤", price: 3000, css: "radial-gradient(circle at 78% 22%, #fff4cf 0 7%, rgba(255,244,207,.25) 8% 14%, transparent 22%), radial-gradient(circle at 50% 120%, #1d3a5c, transparent 60%), linear-gradient(#0b1630, #05070f)" },
  blossom: { name: "벚꽃길", price: 3000, css: "radial-gradient(circle at 15% 20%, rgba(255,182,206,.55) 0 3%, transparent 4%), radial-gradient(circle at 70% 35%, rgba(255,182,206,.45) 0 2%, transparent 3%), radial-gradient(circle at 40% 12%, rgba(255,210,225,.5) 0 2.5%, transparent 3.5%), radial-gradient(circle at 85% 70%, rgba(255,182,206,.4) 0 2%, transparent 3%), linear-gradient(#3a1f2c, #160b12)" },
  snow: { name: "설산", price: 3000, css: "radial-gradient(circle at 20% 30%, #fff 0 .8%, transparent 1.2%), radial-gradient(circle at 60% 18%, #fff 0 .7%, transparent 1.1%), radial-gradient(circle at 82% 45%, #fff 0 .9%, transparent 1.3%), radial-gradient(circle at 35% 60%, #fff 0 .6%, transparent 1%), linear-gradient(transparent 70%, rgba(230,240,255,.35)), linear-gradient(#1c2a3d, #0b111b)" },
  maple: { name: "단풍 숲", price: 3000, css: "radial-gradient(circle at 20% 25%, rgba(230,90,40,.55) 0 3%, transparent 4%), radial-gradient(circle at 75% 20%, rgba(240,150,40,.5) 0 2.5%, transparent 3.5%), radial-gradient(circle at 55% 45%, rgba(200,60,30,.45) 0 2%, transparent 3%), linear-gradient(#3a1d0f, #140904)" },
  lantern: { name: "등불 거리", price: 5000, css: "radial-gradient(circle at 12% 18%, rgba(255,120,60,.9) 0 3%, rgba(255,120,60,.25) 4% 8%, transparent 10%), radial-gradient(circle at 50% 10%, rgba(255,150,70,.9) 0 3%, rgba(255,150,70,.25) 4% 8%, transparent 10%), radial-gradient(circle at 88% 18%, rgba(255,120,60,.9) 0 3%, rgba(255,120,60,.25) 4% 8%, transparent 10%), linear-gradient(#2a0f0c, #0c0403)" },
  galaxy: { name: "은하수", price: 8000, css: "radial-gradient(ellipse at 50% 40%, rgba(140,110,255,.35), transparent 55%), radial-gradient(circle at 25% 30%, #fff 0 .5%, transparent 1%), radial-gradient(circle at 70% 25%, #fff 0 .6%, transparent 1%), radial-gradient(circle at 45% 65%, #cfe3ff 0 .5%, transparent 1%), radial-gradient(circle at 85% 60%, #fff 0 .4%, transparent .9%), linear-gradient(135deg, #0a0820, #1a0f35 50%, #05040f)" },
} as const;
export type YokaiBackground = keyof typeof YOKAI_BACKGROUNDS;
export const isBackground = (v: unknown): v is YokaiBackground => typeof v === "string" && v in YOKAI_BACKGROUNDS;
