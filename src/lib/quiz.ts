/**
 * 오늘의 퀴즈 자동 생성(DB 없이 계산만). 날짜가 같으면 늘 같은 문제가 나옵니다.
 * 정답 근거: GTO 푸시폴드 표(public/data/gto-positions.json) · 프리플랍 승률표(preflop-eq.json, 쌍마다 30만 판)
 * · 핸드 순위표(hand-ranking.json) · 족보 확률.
 * 종류는 날마다 돌아가며: 푸시폴드 → 승률 → 족보 → 레인지.
 */
import { unpackSet } from "@/lib/pushfold";

export type QuizKind = "pushfold" | "equity" | "handrank" | "range" | "potodds" | "outs" | "custom";
export type QuizDraft = { kind: QuizKind; question: string; choices: string[]; answer: number; explanation: string };

export type QuizData = {
  positions: {
    names: string[];
    positions: Record<string, string[]>;
    modes: Record<string, { tables: Record<string, Record<string, ({ s: number; push: string; pushPct: number } | null)[]>> }>;
  };
  /** 169×169 승률(만분율): eq[a * 169 + b] = a가 b를 이길 확률(무승부 반) */
  eq: { names: string[]; eq: number[] };
  /** 핸드 순위: vs["1"] = 상대 1명일 때 패마다 승률 */
  ranking: { names: string[]; vs: Record<string, number[]> };
};

export const KIND_LABEL: Record<QuizKind, string> = {
  pushfold: "푸시폴드",
  equity: "승률",
  handrank: "족보",
  range: "레인지",
  potodds: "팟 오즈",
  outs: "아웃츠",
  custom: "운영자 출제",
};

/** 족보 10가지(높은 순) · 7장(내 패 2 + 보드 5)에서 나오는 경우의 수 */
const HAND_RANKS = [
  { ko: "로열 플러시", seven: 4324 },
  { ko: "스트레이트 플러시", seven: 37260 },
  { ko: "포카드", seven: 224848 },
  { ko: "풀하우스", seven: 3473184 },
  { ko: "플러시", seven: 4047644 },
  { ko: "스트레이트", seven: 6180020 },
  { ko: "트리플", seven: 6461620 },
  { ko: "투페어", seven: 31433400 },
  { ko: "원페어", seven: 58627800 },
  { ko: "하이카드", seven: 23294460 },
];
const SEVEN_TOTAL = 133784560;
const KINDS: QuizKind[] = ["pushfold", "equity", "handrank", "range", "potodds", "outs"];

/** 날짜 → 하루 번호(2026-01-01 = 0) */
export function dayNumber(day: string) {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse("2026-01-01T00:00:00Z")) / 86_400_000);
}

/** 날짜로 정해지는 난수(같은 날 = 같은 문제) */
function seeded(day: string) {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** "K9o" → "K9 오프수트", "AKs" → "AK 수티드", "77" → "77 포켓" */
export function handLabel(name: string) {
  const pretty = name.replace(/T/g, "10");
  // 페어는 이름 옆 괄호에 쓰므로 숫자는 빼고(「55(포켓 페어)」)
  if (name.length === 2) return "포켓 페어";
  return name.endsWith("s") ? `${pretty.slice(0, -1)} 수티드` : `${pretty.slice(0, -1)} 오프수트`;
}

const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

/** 받침에 맞는 조사: 한글 끝글자면 이/가 · 은/는, 아니면 둘 다 씀 */
export function josa(word: string, pair: "이가" | "은는") {
  const lastCh = word[word.length - 1];
  const last = word.charCodeAt(word.length - 1);
  // 카드 이름 끝(숫자 · A K Q J T · s o)은 읽는 소리로: 3(삼) 6(육) 7(칠) 8(팔) T(텐)만 받침
  const spoken = "23456789AKQJTso".includes(lastCh) ? "36780T".includes(lastCh) : null;
  if (spoken === null && (last < 0xac00 || last > 0xd7a3)) return `${word}${pair === "이가" ? "이(가)" : "은(는)"}`;
  const batchim = spoken ?? (last - 0xac00) % 28 !== 0;
  return `${word}${pair === "이가" ? (batchim ? "이" : "가") : batchim ? "은" : "는"}`;
}

function pushfoldQuiz(rand: () => number, data: QuizData): QuizDraft {
  const size = rand() < 0.5 ? "6" : "9";
  const seats = data.positions.positions[size];
  const pushers = seats.slice(0, -1);
  const pusher = pushers[Math.floor(rand() * pushers.length)];
  const stacks = [5, 7, 8, 10, 12, 15, 20];
  const rows = data.positions.modes.none.tables[size][pusher];
  let row = null as { s: number; push: string; pushPct: number } | null;
  for (let i = 0; i < 10 && !row; i++) {
    const s = stacks[Math.floor(rand() * stacks.length)];
    row = rows.find((r) => r && r.s === s) ?? null;
  }
  row ??= rows.find((r) => r && r.s === 10) ?? rows.find((r) => r) ?? null;
  if (!row) return equityQuiz(rand, data);
  const set = unpackSet(row.push);
  // 경계 근처 패(강한 순서로 범위 끝 ±12)에서 골라 너무 뻔하지 않게
  const strength = data.ranking.vs["1"];
  const order = data.positions.names.map((_, i) => i).sort((a, b) => strength[data.ranking.names.indexOf(data.positions.names[b])] - strength[data.ranking.names.indexOf(data.positions.names[a])]);
  const edge = Math.max(0, Math.min(order.length - 1, set.size + Math.floor(rand() * 25) - 12));
  const k = order[edge];
  const hand = data.positions.names[k];
  const push = set.has(k);
  return {
    kind: "pushfold",
    question: `${size}인 테이블, 앞사람이 모두 폴드했어요. ${pusher}에서 스택 ${row.s}bb, 내 패는 ${hand}(${handLabel(hand)}). 올인할까요?`,
    choices: ["올인", "폴드"],
    answer: push ? 0 : 1,
    explanation: `GTO 푸시폴드 차트(앤티 없음) 기준 ${size}인 ${pusher} ${row.s}bb 올인 범위는 전체의 ${row.pushPct}%예요. ${josa(hand, "은는")} 이 범위 ${push ? "안이라 올인" : "밖이라 폴드"}이 정답이에요.`,
  };
}

function equityQuiz(rand: () => number, data: QuizData): QuizDraft {
  const names = data.eq.names;
  // 너무 한쪽으로 기운 대결(90% 이상)은 빼고, 헷갈리는 대결 위주로
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.floor(rand() * names.length);
    const b = Math.floor(rand() * names.length);
    if (a === b) continue;
    const e = data.eq.eq[a * names.length + b] / 10000;
    if (e < 0.3 || e > 0.7) continue;
    const [na, nb] = [names[a], names[b]];
    const answer = Math.abs(e - 0.5) <= 0.02 ? 2 : e > 0.5 ? 0 : 1;
    return {
      kind: "equity",
      question: `프리플랍 올인 대결! ${na}(${handLabel(na)}) vs ${nb}(${handLabel(nb)}), 누가 유리할까요?`,
      choices: [`${na} 유리`, `${nb} 유리`, "거의 반반(48~52%)"],
      answer,
      explanation: `5장 보드를 끝까지 깔았을 때 승률은 ${na} ${pct1(e)} : ${nb} ${pct1(1 - e)}예요(무승부는 반씩, 30만 판 계산).`,
    };
  }
  return handrankQuiz(rand);
}

function handrankQuiz(rand: () => number): QuizDraft {
  let a = Math.floor(rand() * HAND_RANKS.length);
  let b = Math.floor(rand() * HAND_RANKS.length);
  if (a === b) b = (b + 1 + Math.floor(rand() * 3)) % HAND_RANKS.length;
  // 보기 순서는 섞되 높은 쪽이 정답
  if (rand() < 0.5) [a, b] = [b, a];
  const high = Math.min(a, b);
  const p = (i: number) => {
    const x = (HAND_RANKS[i].seven / SEVEN_TOTAL) * 100;
    return x >= 1 ? `${x.toFixed(1)}%` : `${x.toFixed(3)}%`;
  };
  return {
    kind: "handrank",
    question: `${HAND_RANKS[a].ko} vs ${HAND_RANKS[b].ko}, 어떤 족보가 더 높을까요?`,
    choices: [HAND_RANKS[a].ko, HAND_RANKS[b].ko],
    answer: high === a ? 0 : 1,
    explanation: `${josa(HAND_RANKS[high].ko, "이가")} ${high + 1}위로 더 높아요. 7장에서 나올 확률: ${HAND_RANKS[a].ko} ${p(a)} · ${HAND_RANKS[b].ko} ${p(b)} — 드문 족보일수록 높아요.`,
  };
}

const RANGE_BUCKETS = [
  { label: "상위 10% 안", max: 10 },
  { label: "상위 10~25%", max: 25 },
  { label: "상위 25~50%", max: 50 },
  { label: "50% 밖", max: 101 },
];

function rangeQuiz(rand: () => number, data: QuizData): QuizDraft {
  const names = data.ranking.names;
  const eq = data.ranking.vs["1"];
  const order = names.map((_, i) => i).sort((a, b) => eq[b] - eq[a]);
  const combos = (n: string) => (n.length === 2 ? 6 : n.endsWith("s") ? 4 : 12);
  const top = new Array<number>(names.length);
  let cum = 0;
  order.forEach((h, i) => {
    cum += combos(names[h]);
    top[h] = (cum / 1326) * 100;
    void i;
  });
  const h = order[Math.floor(rand() * order.length)];
  const answer = RANGE_BUCKETS.findIndex((bk) => top[h] <= bk.max);
  return {
    kind: "range",
    question: `${names[h]}(${handLabel(names[h])})는 169가지 시작 패 중 상위 몇 %일까요?`,
    choices: RANGE_BUCKETS.map((bk) => bk.label),
    answer,
    explanation: `${names[h]}는 1:1 승률 기준 ${order.indexOf(h) + 1}위, 이 패까지 누적하면 상위 ${top[h].toFixed(1)}%예요.`,
  };
}

/** 숫자 보기: 정답 + 오답 후보에서 서로 다른 4개(작은 순) */
function numberChoices(rand: () => number, answer: number, wrong: number[], fmt: (n: number) => string) {
  const picked = [answer];
  for (const w of [...wrong].sort(() => rand() - 0.5)) {
    if (picked.length >= 4) break;
    if (w > 0 && !picked.includes(w)) picked.push(w);
  }
  picked.sort((a, b) => a - b);
  return { choices: picked.map(fmt), answer: picked.indexOf(answer) };
}

/** 팟 오즈: 콜에 필요한 최소 승률 = 콜 금액 ÷ (콜한 뒤 전체 팟) */
const BET_SIZES = [
  { f: 1 / 4, ko: "팟의 1/4" },
  { f: 1 / 3, ko: "팟의 1/3" },
  { f: 1 / 2, ko: "하프 팟" },
  { f: 2 / 3, ko: "팟의 2/3" },
  { f: 3 / 4, ko: "팟의 3/4" },
  { f: 1, ko: "팟 사이즈" },
  { f: 3 / 2, ko: "팟의 1.5배" },
  { f: 2, ko: "팟의 2배(오버벳)" },
];
function potoddsQuiz(rand: () => number): QuizDraft {
  const pot = (2 + Math.floor(rand() * 19)) * 50;
  const size = BET_SIZES[Math.floor(rand() * BET_SIZES.length)];
  const bet = Math.round((pot * size.f) / 5) * 5;
  const need = Math.round((bet / (pot + 2 * bet)) * 100);
  const forgot = Math.round((bet / (pot + bet)) * 100); // 내 콜을 팟에 안 넣는 흔한 실수
  const { choices, answer } = numberChoices(rand, need, [forgot, Math.round(need / 2), need + 8, need - 7, need + 15, Math.min(95, Math.round((bet / pot) * 100))], (n) => `${n}%`);
  return {
    kind: "potodds",
    question: `팟 ${pot.toLocaleString()}에 상대가 ${bet.toLocaleString()} 베팅(${size.ko}). 콜하려면 최소 몇 % 승률이 필요할까요?`,
    choices,
    answer,
    explanation: `콜 금액 ÷ 콜한 뒤 전체 팟 = ${bet} ÷ (${pot} + ${bet} + ${bet}) ≈ ${need}%. 내 콜까지 팟에 넣는 걸 잊으면 ${forgot}%로 잘못 계산하기 쉬워요.`,
  };
}

/** 아웃츠: 플랍에서 다음 카드로 원하는 패가 되는 카드 수 */
const OUTS = [
  { hand: "A♥5♥", board: "K♥9♥2♣", goal: "플러시", outs: 9, why: "남은 하트 13 − 4 = 9장" },
  { hand: "9♠8♦", board: "7♣6♥2♠", goal: "스트레이트", outs: 8, why: "5 네 장 + 10 네 장(오픈엔디드)" },
  { hand: "9♠8♦", board: "6♣5♥K♠", goal: "스트레이트", outs: 4, why: "7 네 장만(거트샷)" },
  { hand: "9♥8♥", board: "7♥6♥2♠", goal: "플러시나 스트레이트", outs: 15, why: "하트 9장 + 5·10 중 하트가 아닌 6장" },
  { hand: "Q♥J♥", board: "9♥8♣2♥", goal: "플러시나 스트레이트", outs: 12, why: "하트 9장 + 10 중 하트가 아닌 3장" },
  { hand: "7♠7♦", board: "7♣K♥2♠", goal: "풀하우스 이상", outs: 7, why: "K 3장 + 2 3장 + 마지막 7 1장" },
  { hand: "K♠9♦", board: "K♣9♥2♠", goal: "풀하우스", outs: 4, why: "남은 K 2장 + 9 2장" },
  { hand: "A♠K♦", board: "9♣6♥2♠", goal: "탑 페어(A나 K)", outs: 6, why: "A 3장 + K 3장" },
  { hand: "A♠K♦", board: "A♣7♥2♠", goal: "트리플(A 세 장)", outs: 2, why: "남은 A 2장" },
  { hand: "5♣5♦", board: "K♥9♠2♣", goal: "세트(5 세 장)", outs: 2, why: "남은 5 2장" },
  { hand: "J♠10♠", board: "Q♠9♦3♣", goal: "스트레이트", outs: 8, why: "K 네 장 + 8 네 장(오픈엔디드)" },
  { hand: "A♦K♦", board: "Q♦J♣4♦", goal: "플러시나 스트레이트", outs: 12, why: "다이아 9장 + 10 중 다이아가 아닌 3장" },
];
function outsQuiz(rand: () => number): QuizDraft {
  const s = OUTS[Math.floor(rand() * OUTS.length)];
  const { choices, answer } = numberChoices(rand, s.outs, [s.outs - 3, s.outs - 2, s.outs - 1, s.outs + 1, s.outs + 2, s.outs + 3], (n) => `${n}장`);
  return {
    kind: "outs",
    question: `내 패 ${s.hand}, 플랍 ${s.board}. 턴 한 장으로 「${s.goal}」 완성 — 이런 카드(아웃츠)는 몇 장일까요?`,
    choices,
    answer,
    explanation: `${s.why} = ${s.outs}장. 턴에 나올 확률은 ${s.outs}/47 ≈ ${((s.outs / 47) * 100).toFixed(0)}%, 리버까지 보면 대략 아웃츠×4 ≈ ${Math.min(100, s.outs * 4)}%예요.`,
  };
}

/** 그날 문제(같은 날짜 = 같은 문제) */
export function generateQuiz(day: string, data: QuizData): QuizDraft {
  const rand = seeded(day);
  const kind = KINDS[((dayNumber(day) % KINDS.length) + KINDS.length) % KINDS.length];
  if (kind === "pushfold") return pushfoldQuiz(rand, data);
  if (kind === "equity") return equityQuiz(rand, data);
  if (kind === "handrank") return handrankQuiz(rand);
  if (kind === "potodds") return potoddsQuiz(rand);
  if (kind === "outs") return outsQuiz(rand);
  return rangeQuiz(rand, data);
}
