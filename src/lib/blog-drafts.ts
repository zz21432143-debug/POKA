import { HOLDEM_GUIDES } from "@/lib/holdem-guides";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import { SITE_HOST } from "@/lib/site";
import { BLOG_TOOL_POSTS } from "@/lib/blog-tool-posts";

/** 블로그에 붙는 링크는 늘 실제 사이트 주소 */
const BASE = `https://${SITE_HOST}`;

/**
 * 네이버 블로그 글감: 가이드마다 「요약 + POKA 전체 글 링크」 글을 만들어 둠(관리자가 복사해서 올림).
 * 본문 통째 복사는 하지 않음(같은 글이 두 곳에 있으면 검색에서 손해) — 첫 문장 · 소제목 · 소제목 첫 문장만.
 */
export type BlogDraft = {
  /** "holdem:set-mining" · "dealer:how-to-become-dealer" · "tool:shot-clock" */
  key: string;
  kind: "holdem" | "dealer" | "tool";
  /** 올릴 블로그 카테고리 */
  category: "홀덤 공부" | "딜러 실무" | "매장 관리";
  title: string;
  body: string;
  tags: string;
  url: string;
  /** 같이 올리면 좋은 화면(캡처) */
  photo: string | null;
};

/** 블로그 링크로 들어온 방문은 관리자 「유입 경로」에 「📝 블로그」로 */
export const BLOG_SOURCE = "blog";

/** 문장 하나(마침표 · 물음표 기준, 너무 길면 자름) */
function firstSentence(text: string, max = 110) {
  const flat = text.replace(/\s+/g, " ").trim();
  const m = /^(.+?[.?!])(?=\s|$)/.exec(flat);
  const s = (m ? m[1] : flat).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** 첫 문단에서 앞 두 문장 */
function intro(body: string) {
  const para = body.split(/\n\s*\n/)[0] ?? "";
  const one = firstSentence(para, 160);
  const rest = para.replace(/\s+/g, " ").trim().slice(one.length).trim();
  const two = rest ? firstSentence(rest, 160) : "";
  return [one, two].filter(Boolean).join(" ");
}

/** 「■ 소제목」과 그 아래 첫 문장(최대 4개) */
function sections(body: string) {
  const out: { head: string; line: string }[] = [];
  const blocks = body.split(/\n(?=■)/).filter((b) => b.startsWith("■"));
  for (const block of blocks) {
    const [headLine, ...rest] = block.split("\n");
    const head = headLine.replace(/^■\s*/, "").trim();
    if (!head || /^정리$/.test(head)) continue;
    // 소제목 아래 첫 줄만(목록 기호 · 번호는 떼고, 한 줄에 이어진 다음 번호 앞에서 자름)
    const first = (rest.find((l) => l.trim()) ?? "")
      .trim()
      .replace(/^(•|-|\d+\)|\d+\.)\s*/, "")
      .split(/\s(?:•|\d+\))\s/)[0];
    out.push({ head, line: first ? firstSentence(first) : "" });
    if (out.length >= 4) break;
  }
  return out;
}

/** "셋 마이닝 — 작은 …" → "셋마이닝" */
function titleTag(title: string) {
  return title.split(/\s[—-]\s/)[0].replace(/[^\p{L}\p{N}]/gu, "").slice(0, 20);
}

function draft(kind: "holdem" | "dealer", g: { slug: string; title: string; summary: string; body: string; tool?: { href: string; label: string } }): BlogDraft {
  const path = kind === "holdem" ? `/info/holdem/${g.slug}` : `/info/guide/${g.slug}`;
  const url = `${BASE}${path}?from=${BLOG_SOURCE}`;
  const label = kind === "holdem" ? "홀덤 가이드" : "딜러 가이드";
  const points = sections(g.body);
  const body = [
    g.summary,
    "",
    intro(g.body),
    "",
    points.length ? "이 글에서 다루는 것" : "",
    ...points.map((p) => `✔ ${p.head}${p.line ? `\n   ${p.line}` : ""}`),
    "",
    `예시 · 계산까지 담은 전체 글은 POKA ${label}에서 볼 수 있어요.`,
    `👉 ${url}`,
    "",
    POKA_LINE,
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
  const tags = tagLine([titleTag(g.title), ...KIND_TAGS[kind]]);
  return {
    key: `${kind}:${g.slug}`,
    kind,
    category: kind === "holdem" ? "홀덤 공부" : "딜러 실무",
    title: `${g.title} | ${label}`,
    body,
    tags,
    url,
    photo: g.tool ? `${BASE}${g.tool.href}` : null,
  };
}

/**
 * 네이버 블로그 태그(최대 30개): 글 제목 태그 + 종류별 태그 + 모든 글 공통(TDA · GTO 꼭 포함).
 * 글과 상관없는 태그를 많이 붙이면 오히려 손해라, 홀덤 · 딜러 · 매장 이야기에 맞는 것만.
 */
const COMMON_TAGS = ["홀덤", "텍사스홀덤", "포커", "홀덤토너먼트", "TDA", "TDA룰", "GTO", "홀덤펍", "POKA", "포카"];
const KIND_TAGS: Record<BlogDraft["kind"], string[]> = {
  holdem: ["홀덤전략", "홀덤공부", "포커공부", "포커전략", "홀덤팁", "홀덤초보", "GTO전략", "포커레인지", "팟오즈", ...COMMON_TAGS],
  dealer: ["홀덤딜러", "포커딜러", "딜러가이드", "딜러실무", "딜러교육", "딜러구인", "홀덤딜러구인", "딜러알바", "홀덤매장", ...COMMON_TAGS],
  tool: ["매장관리", "홀덤매장", "홀덤펍운영", "딜러로테이션", "게임현황판", "샷클락", "블라인드타이머", "홀덤딜러", ...COMMON_TAGS],
};
const MAX_TAGS = 30;

function tagLine(tags: string[]) {
  return tags
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((t, i, all) => t && all.indexOf(t) === i)
    .slice(0, MAX_TAGS)
    .map((t) => `#${t}`)
    .join(" ");
}

const POKA_LINE ="POKA는 딜러 구인 · 게임 현황판 · 딜러 로테이션 · 홀덤 공부 도구를 한곳에 모은 홀덤 커뮤니티예요.";

/** 매장 관리 도구 소개 글(직접 쓴 글) */
function toolDraft(t: (typeof BLOG_TOOL_POSTS)[number]): BlogDraft {
  const url = `${BASE}${t.path}?from=${BLOG_SOURCE}`;
  const body = [
    t.body,
    "",
    "바로 써 보기 👉 " + url,
    "",
    POKA_LINE,
  ].join("\n");
  const category = t.category ?? "매장 관리";
  const tags = tagLine([...t.tags, ...KIND_TAGS[category === "딜러 실무" ? "dealer" : "tool"]]);
  return { key: `tool:${t.slug}`, kind: "tool", category, title: `${t.title} | ${category === "딜러 실무" ? "딜러 실무" : "매장 관리"}`, body, tags, url, photo: `${BASE}${t.path}` };
}

/** 올릴 순서: 홀덤 · 딜러 번갈아(하루 1편씩), 도구 소개는 5편마다 한 편 */
export function blogDrafts(): BlogDraft[] {
  const holdem = HOLDEM_GUIDES.map((g) => draft("holdem", g));
  const dealer = GUIDE_ARTICLES.map((g) => draft("dealer", g));
  const out: BlogDraft[] = [];
  for (let i = 0; i < Math.max(holdem.length, dealer.length); i++) {
    if (holdem[i]) out.push(holdem[i]);
    if (dealer[i]) out.push(dealer[i]);
  }
  // 첫 두 편(포지션 · 딜러가 하는 일) 다음에 샷클락, 그 뒤 5편마다 도구 한 편
  BLOG_TOOL_POSTS.map(toolDraft).forEach((t, i) => out.splice(2 + i * 6, 0, t));
  // 검색에 걸리기 시작한 주제는 먼저(서치콘솔 검색어 기준 · 2026-10-23: 애드온 · 플로어 · TDA 룰)
  const first = BLOG_PRIORITY.map((k) => out.find((d) => d.key === k)).filter((d): d is BlogDraft => Boolean(d));
  return [...first, ...out.filter((d) => !BLOG_PRIORITY.includes(d.key))];
}

/** 블로그에 먼저 올릴 글감(검색어를 보고 바꿈) */
export const BLOG_PRIORITY = ["holdem:add-on", "dealer:floor-role", "dealer:tda-core-rules", "tool:tda-rules", "dealer:tournament-terms", "dealer:showdown"];
