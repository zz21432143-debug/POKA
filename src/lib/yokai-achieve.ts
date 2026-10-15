/**
 * 요괴 마을: 사이트 활동 기록 → 어떤 요괴가 찾아오는지 · 구미호 「아홉 꼬리」 진행도.
 * 숫자는 여기 한 곳에서만 바꿈(도감 안내 문구도 여기서 만듦). 순수 함수만.
 */
import { YOKAI, type YokaiSpecies } from "@/lib/yokai";

export type YokaiStats = {
  attendDays: number;
  dawnAttend: number;
  freeActs: number;
  comments: number;
  handActs: number;
  urgentActs: number;
  drillRuns: number;
  shares: number;
  storeTools: number;
  quizStreak: number;
  quizCorrect: number;
  tdaCorrect: number;
  pointsEarned: number;
  weeklyRank: number | null;
  level: number;
  upvotes: number;
  monthlyHonors: number;
  studyDays: number;
};

/** 가진 요괴 → 지금 단계 */
export type OwnedStages = Partial<Record<YokaiSpecies, number>>;

export const NEED = {
  // 일반: 활동 시작 후 며칠 ~ 2주
  nudeogi: 20,
  samagwi: 50,
  eodukssini: 10,
  noejeongwi: 1,
  bulgasari: 50,
  hwaryong: 10,
  bakjwigwi: 7,
  deungbulgwi: 1,
  // 희귀: 3주 ~ 2달
  keunnuni: 14,
  seolnyeo: 30,
  tamrang: 20000,
  yacha: 3,
  gangcheori: 40,
  sinroksu: 50,
  horibyeonggwi: 10,
  // 영웅: 2 ~ 4달
  sacheonwang: 3,
  tengu: 50,
  amseokgwi: 100,
  haetae: 10,
  // 전설 염라대왕: 영웅 1 + 희귀 4
  yeomraHero: 1,
  yeomraRare: 4,
} as const;

/** 구미호 「아홉 꼬리의 시련」 */
export const TAILS: { label: string; done: (s: YokaiStats, o: OwnedStages) => boolean; progress: (s: YokaiStats, o: OwnedStages) => string }[] = [
  { label: "출석 60일", done: (s) => s.attendDays >= 60, progress: (s) => `${Math.min(s.attendDays, 60)}/60` },
  { label: "퀴즈 80문제 정답(그날 푼 것)", done: (s) => s.quizCorrect >= 80, progress: (s) => `${Math.min(s.quizCorrect, 80)}/80` },
  { label: "팟 계산 연습 100번", done: (s) => s.drillRuns >= 100, progress: (s) => `${Math.min(s.drillRuns, 100)}/100` },
  { label: "핸드리뷰 글 · 투표 20번", done: (s) => s.handActs >= 20, progress: (s) => `${Math.min(s.handActs, 20)}/20` },
  { label: "자유게시판 글 · 댓글 50개", done: (s) => s.freeActs >= 50, progress: (s) => `${Math.min(s.freeActs, 50)}/50` },
  { label: "요괴 3종을 3단계까지", done: (_, o) => stagedCount(o, 3) >= 3, progress: (_, o) => `${Math.min(stagedCount(o, 3), 3)}/3` },
  { label: "도감 15종", done: (_, o) => ownedCount(o) >= 15, progress: (_, o) => `${Math.min(ownedCount(o), 15)}/15` },
  { label: "월간 칭호 1번", done: (s) => s.monthlyHonors >= 1, progress: (s) => `${Math.min(s.monthlyHonors, 1)}/1` },
  { label: "레벨 60", done: (s) => s.level >= 60, progress: (s) => `Lv.${s.level}/60` },
];

const ownedCount = (o: OwnedStages) => Object.keys(o).length;
const stagedCount = (o: OwnedStages, stage: number) => Object.values(o).filter((st) => (st ?? 0) >= stage).length;
const rarityCount = (o: OwnedStages, rarity: string) => (Object.keys(o) as YokaiSpecies[]).filter((s) => YOKAI[s].rarity === rarity).length;

export function gumihoTails(s: YokaiStats, o: OwnedStages) {
  return TAILS.map((t) => ({ label: t.label, done: t.done(s, o), progress: t.progress(s, o) }));
}

export function yeomraProgress(o: OwnedStages) {
  return { hero: rarityCount(o, "hero"), rare: rarityCount(o, "rare") };
}

/** 이 요괴가 찾아올 조건을 채웠는지(시작 요괴는 고를 때만) */
export function meets(species: YokaiSpecies, s: YokaiStats, o: OwnedStages): boolean {
  switch (species) {
    case "nudeogi": return s.freeActs >= NEED.nudeogi;
    case "samagwi": return s.comments >= NEED.samagwi;
    case "eodukssini": return s.handActs >= NEED.eodukssini;
    case "noejeongwi": return s.urgentActs >= NEED.noejeongwi;
    case "bulgasari": return s.drillRuns >= NEED.bulgasari;
    case "hwaryong": return s.shares >= NEED.hwaryong;
    case "bakjwigwi": return s.dawnAttend >= NEED.bakjwigwi;
    case "deungbulgwi": return s.storeTools >= NEED.deungbulgwi;
    case "keunnuni": return s.quizStreak >= NEED.keunnuni;
    case "seolnyeo": return s.attendDays >= NEED.seolnyeo;
    case "tamrang": return s.pointsEarned >= NEED.tamrang;
    case "yacha": return s.weeklyRank != null && s.weeklyRank <= NEED.yacha;
    case "gangcheori": return s.level >= NEED.gangcheori;
    case "dueoksini": return (o.dokkaebi ?? 0) >= 5;
    case "sinroksu": return s.upvotes >= NEED.sinroksu;
    case "horibyeonggwi": return ownedCount(o) >= NEED.horibyeonggwi;
    case "sacheonwang": return s.monthlyHonors >= NEED.sacheonwang;
    case "tengu": return s.studyDays >= NEED.tengu;
    case "amseokgwi": return s.attendDays >= NEED.amseokgwi;
    case "haetae": return s.tdaCorrect >= NEED.haetae;
    case "gumiho": return TAILS.every((t) => t.done(s, o));
    case "yeomra": {
      const p = yeomraProgress(o);
      return p.hero >= NEED.yeomraHero && p.rare >= NEED.yeomraRare;
    }
    default: return false;
  }
}

/** 조건을 채운 새 요괴들(도감 · 단계에 따라 이어서 찾아오는 것까지 한 번에) */
export function arrivals(s: YokaiStats, owned: OwnedStages): YokaiSpecies[] {
  const o: OwnedStages = { ...owned };
  const out: YokaiSpecies[] = [];
  for (let round = 0; round < 4; round++) {
    let added = false;
    for (const sp of Object.keys(YOKAI) as YokaiSpecies[]) {
      if (o[sp] || YOKAI[sp].rarity === "starter") continue;
      if (meets(sp, s, o)) {
        o[sp] = 1;
        out.push(sp);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

/** 못 만난 요괴의 진행도 한 줄(도감 상세) */
export function progressLine(species: YokaiSpecies, s: YokaiStats, o: OwnedStages): string | null {
  const pct = (have: number, need: number, unit = "") => `${Math.min(have, need).toLocaleString()}${unit} / ${need.toLocaleString()}${unit}`;
  switch (species) {
    case "nudeogi": return pct(s.freeActs, NEED.nudeogi, "개");
    case "samagwi": return pct(s.comments, NEED.samagwi, "개");
    case "eodukssini": return pct(s.handActs, NEED.eodukssini, "번");
    case "noejeongwi": return pct(s.urgentActs, NEED.noejeongwi, "번");
    case "bulgasari": return pct(s.drillRuns, NEED.bulgasari, "번");
    case "hwaryong": return pct(s.shares, NEED.hwaryong, "일");
    case "bakjwigwi": return pct(s.dawnAttend, NEED.bakjwigwi, "번");
    case "deungbulgwi": return pct(s.storeTools, NEED.deungbulgwi, "번");
    case "keunnuni": return `지금 연속 ${s.quizStreak}일 / ${NEED.keunnuni}일`;
    case "seolnyeo": return pct(s.attendDays, NEED.seolnyeo, "일");
    case "tamrang": return pct(s.pointsEarned, NEED.tamrang, "P");
    case "yacha": return s.weeklyRank ? `이번 주 ${s.weeklyRank}위 / ${NEED.yacha}위 안` : "이번 주 순위 없음";
    case "gangcheori": return `Lv.${s.level} / ${NEED.gangcheori}`;
    case "dueoksini": return `도깨비 ${o.dokkaebi ?? 0}단계 / 5단계`;
    case "sinroksu": return pct(s.upvotes, NEED.sinroksu, "개");
    case "horibyeonggwi": return pct(ownedCount(o), NEED.horibyeonggwi, "종");
    case "sacheonwang": return pct(s.monthlyHonors, NEED.sacheonwang, "번");
    case "tengu": return pct(s.studyDays, NEED.tengu, "일");
    case "amseokgwi": return pct(s.attendDays, NEED.amseokgwi, "일");
    case "haetae": return pct(s.tdaCorrect, NEED.haetae, "번");
    case "gumiho": return `꼬리 ${TAILS.filter((t) => t.done(s, o)).length} / 9`;
    case "yeomra": {
      const p = yeomraProgress(o);
      return `영웅 ${Math.min(p.hero, 1)}/1 · 희귀 ${Math.min(p.rare, 4)}/4`;
    }
    default: return null;
  }
}
