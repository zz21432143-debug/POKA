import Link from "next/link";
import type { ReactNode } from "react";

/** 가이드 분류(목록 탭) — 없는 글은 「더 보기」 */
export const GUIDE_CATEGORIES: { id: string; label: string; hint: string; slugs: string[] }[] = [
  {
    id: "start",
    label: "입문",
    hint: "딜러를 처음 준비하는 사람",
    slugs: ["how-to-become-dealer", "dealer-first-month", "holdem-dealer", "dealer-interview", "new-dealer-checklist", "dealer-dress-code", "dealer-glossary", "seats-and-button", "holdem-actions", "action-order", "hand-rankings", "dealer-dress-seasons", "dealer-guest-manners", "dealer-resume"],
  },
  {
    id: "skill",
    label: "딜링 기술",
    hint: "셔플 · 피치 · 칩 · 팟 · 판정",
    slugs: ["dealing-order", "shuffle-pitch-practice", "chip-handling-pot", "chip-colors-units", "side-pots", "multiple-side-pots", "showdown", "showdown-reading", "dealer-calls", "dealer-mistakes", "reading-hand-reviews", "self-dealing-practice-kit"],
  },
  {
    id: "rules",
    label: "룰 · 토너먼트",
    hint: "TDA · 블라인드 · 분쟁 대처",
    slugs: ["blinds-antes", "tda-core-rules", "tournament-structure", "tournament-terms", "color-up", "blind-structure-reading", "tournament-vs-ring-dealer", "table-balancing", "floor-call-disputes", "first-tournament-dealer-checklist", "late-reg-reentry"],
  },
  {
    id: "work",
    label: "근무 · 매장",
    hint: "급여 · 로테이션 · 건강 · 매장 운영",
    slugs: ["dealer-pay-structure", "dealer-pay", "urgent-shift-tips", "dealer-rotation-guide", "seat-draw-guide", "open-close-checklist", "dealer-health", "night-shift-safety", "dealer-career-path", "dealer-daily-routine", "dealer-hand-care", "training-new-dealers"],
  },
];

/** 본문 용어 → 관련 가이드(글마다 처음 나온 곳 하나만 · 최대 6개 · 자기 글 제외) */
const TERM_LINKS: [string, string][] = [
  ["블라인드 구조", "blind-structure-reading"],
  ["사이드팟", "multiple-side-pots"],
  ["핸드 랭킹", "hand-rankings"],
  ["4대보험", "dealer-pay-structure"],
  ["3.3%", "dealer-pay-structure"],
  ["오버칩", "tda-core-rules"],
  ["TDA", "tda-core-rules"],
  ["쇼다운", "showdown-reading"],
  ["키커", "showdown-reading"],
  ["미스딜", "dealer-mistakes"],
  ["컬러업", "color-up"],
  ["밸런싱", "table-balancing"],
  ["칩 색깔", "chip-colors-units"],
  ["로테이션", "dealer-rotation-guide"],
  ["플로어", "floor-call-disputes"],
  ["피치", "shuffle-pitch-practice"],
  ["셔플", "shuffle-pitch-practice"],
  ["체인지", "chip-handling-pot"],
  ["앤티", "blinds-antes"],
  ["면접", "dealer-interview"],
  ["리엔트리", "late-reg-reentry"],
  ["이력서", "dealer-resume"],
  ["핸드리뷰", "reading-hand-reviews"],
  ["팟 오즈", "reading-hand-reviews"],
];
const MAX_LINKS = 6;

export function linkGuideTerms(body: string, selfSlug: string): ReactNode[] {
  const terms = TERM_LINKS.filter(([, slug]) => slug !== selfSlug);
  const pattern = new RegExp(terms.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  const usedTerms = new Set<string>();
  const usedSlugs = new Set<string>();
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of body.matchAll(pattern)) {
    const term = match[0];
    const slug = terms.find(([t]) => t === term)?.[1];
    if (!slug || usedTerms.has(term) || usedSlugs.has(slug) || usedSlugs.size >= MAX_LINKS) continue;
    usedTerms.add(term);
    usedSlugs.add(slug);
    const at = match.index ?? 0;
    out.push(body.slice(last, at));
    out.push(
      <Link key={`${term}-${at}`} href={`/info/guide/${slug}`} data-guide-term className="font-semibold text-[#e7c98a] underline decoration-[#c9a25c]/50 underline-offset-4 hover:text-white">
        {term}
      </Link>,
    );
    last = at + term.length;
  }
  out.push(body.slice(last));
  return out;
}
