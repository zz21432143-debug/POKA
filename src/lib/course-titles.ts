import { COURSES, courseOf, stepHref, stepKey, type CourseStep } from "@/lib/courses";
import { HOLDEM_GUIDES } from "@/lib/holdem-guides";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import type { CourseView } from "@/components/study/course-progress";

/** 코스 글 제목(가이드 제목에서 「 — 」 뒤 설명은 뺌) */
export function stepTitle(step: CourseStep) {
  const row = step.kind === "holdem" ? HOLDEM_GUIDES.find((r) => r.slug === step.slug) : GUIDE_ARTICLES.find((r) => r.slug === step.slug);
  return (row?.title ?? step.slug).split(" — ")[0];
}

/** 화면에 넘길 코스 목록(제목 · 주소 채움) */
export function courseViews(): CourseView[] {
  return COURSES.map((c) => ({
    id: c.id,
    title: c.title,
    level: c.level,
    hint: c.hint,
    steps: c.steps.map((s) => ({ key: stepKey(s), href: stepHref(s), title: stepTitle(s) })),
  }));
}

/** 가이드 글 아래 코스 상자 props(코스에 없는 글이면 null) */
export function courseBoxProps(step: CourseStep) {
  const hit = courseOf(step);
  if (!hit) return null;
  return {
    stepKey: stepKey(step),
    course: { id: hit.course.id, title: hit.course.title, total: hit.course.steps.length },
    index: hit.index,
    next: hit.next ? { href: stepHref(hit.next), title: stepTitle(hit.next) } : null,
  };
}
