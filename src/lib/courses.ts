/**
 * 공부 코스: 가이드 글을 읽는 순서대로 묶음(홀덤 가이드 /info/holdem · 딜러 가이드 /info/guide).
 * 다 읽으면 코스마다 한 번 COURSE_POINTS. 읽음 기록은 회원은 서버(ToolSaved), 비회원은 이 기기에만.
 */
export type CourseStep = { kind: "holdem" | "guide"; slug: string };
export type Course = { id: string; title: string; level: string; hint: string; steps: CourseStep[] };

export const COURSE_POINTS = 50;

const h = (slug: string): CourseStep => ({ kind: "holdem", slug });
const g = (slug: string): CourseStep => ({ kind: "guide", slug });

export const COURSES: Course[] = [
  {
    id: "start",
    title: "홀덤 입문",
    level: "처음이에요",
    hint: "자리 · 블라인드 · 액션 · 족보 · 쇼다운까지 게임 한 판의 흐름",
    steps: [g("seats-and-button"), g("blinds-antes"), g("holdem-actions"), g("action-order"), g("hand-rankings"), g("showdown"), g("side-pots"), h("position"), h("pot-odds-equity")],
  },
  {
    id: "skill",
    title: "실력 올리기",
    level: "규칙은 알아요",
    hint: "레인지로 생각하고, 프리플랍부터 리버까지 판단하는 순서",
    steps: [
      h("thinking-in-ranges"),
      h("preflop-chart-reading"),
      h("open-sizing-limping"),
      h("three-bet-four-bet"),
      h("blind-defense"),
      h("continuation-bet"),
      h("board-texture"),
      h("hand-reading-steps"),
      h("value-bet-sizing"),
      h("choosing-bluffs"),
      h("river-call-decisions"),
      h("common-leaks"),
    ],
  },
  {
    id: "tournament",
    title: "토너먼트",
    level: "대회 나가요",
    hint: "용어 · 구조표 · 스택별 전략 · ICM",
    steps: [g("tournament-terms"), g("blind-structure-reading"), h("tournament-phases"), h("tournament-stack-strategy"), h("ante-effect"), h("short-stack-resteal"), h("icm-basics"), h("add-on"), h("rebuy-reentry"), h("heads-up-final-table")],
  },
  {
    id: "dealer",
    title: "딜러 되기",
    level: "딜러 준비 중",
    hint: "딜링 순서 · 셔플 · 팟 정산 · 쇼다운 판정 · TDA · 면접",
    steps: [
      g("how-to-become-dealer"),
      g("holdem-dealer"),
      g("dealing-order"),
      g("shuffle-pitch-practice"),
      g("chip-handling-pot"),
      g("multiple-side-pots"),
      g("showdown-reading"),
      g("dealer-calls"),
      g("dealer-mistakes"),
      g("tda-core-rules"),
      g("dealer-interview"),
      g("applying-to-jobs"),
    ],
  },
  {
    id: "variants",
    title: "다른 포커 규칙",
    level: "오마하 · 숏덱",
    hint: "오마하(PLO) · 숏덱 두 가지 족보 규칙",
    steps: [h("omaha-rules"), h("short-deck-rules")],
  },
];

export const stepKey = (step: CourseStep) => `${step.kind}:${step.slug}`;
export const stepHref = (step: CourseStep) => (step.kind === "holdem" ? `/info/holdem/${step.slug}` : `/info/guide/${step.slug}`);
export const getCourse = (id: string) => COURSES.find((c) => c.id === id) ?? null;

/** 이 글이 들어 있는 첫 코스 · 몇 번째 · 다음 글 */
export function courseOf(step: CourseStep) {
  const key = stepKey(step);
  for (const course of COURSES) {
    const index = course.steps.findIndex((s) => stepKey(s) === key);
    if (index >= 0) return { course, index, next: course.steps[index + 1] ?? null };
  }
  return null;
}

/** 읽은 글로 끝낸 코스(보상 줄 것) — 이미 받은 코스는 뺌 */
export function newlyCompleted(read: ReadonlySet<string>, done: ReadonlySet<string>) {
  return COURSES.filter((c) => !done.has(c.id) && c.steps.every((s) => read.has(stepKey(s)))).map((c) => c.id);
}

/** 읽음 기록으로 받아 줄 글인지(코스에 있는 글만) */
export function isCourseStep(key: string) {
  return COURSES.some((c) => c.steps.some((s) => stepKey(s) === key));
}
