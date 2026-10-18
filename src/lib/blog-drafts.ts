import { HOLDEM_GUIDES } from "@/lib/holdem-guides";
import { GUIDE_ARTICLES } from "@/lib/info-pages";
import { SITE_HOST } from "@/lib/site";

/** 블로그에 붙는 링크는 늘 실제 사이트 주소 */
const BASE = `https://${SITE_HOST}`;

/**
 * 네이버 블로그 글감: 가이드마다 「요약 + POKA 전체 글 링크」 글을 만들어 둠(관리자가 복사해서 올림).
 * 본문 통째 복사는 하지 않음(같은 글이 두 곳에 있으면 검색에서 손해) — 첫 문장 · 소제목 · 소제목 첫 문장만.
 */
export type BlogDraft = {
  /** "holdem:set-mining" · "dealer:how-to-become-dealer" */
  key: string;
  kind: "holdem" | "dealer";
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
    "✍️ (여기에 한두 줄: 매장에서 직접 겪은 일이나 느낀 점을 적으면 더 좋아요)",
    "",
    `예시 · 계산까지 담은 전체 글은 POKA ${label}에서 볼 수 있어요.`,
    `👉 ${url}`,
    "",
    "POKA는 딜러 구인 · 게임 현황판 · 딜러 로테이션 · 홀덤 공부 도구를 한곳에 모은 홀덤 커뮤니티예요.",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
  const tags = [
    "홀덤",
    kind === "holdem" ? "홀덤전략" : "홀덤딜러",
    kind === "holdem" ? "포커공부" : "딜러가이드",
    titleTag(g.title),
    "POKA",
  ]
    .filter((t, i, all) => t && all.indexOf(t) === i)
    .map((t) => `#${t}`)
    .join(" ");
  return {
    key: `${kind}:${g.slug}`,
    kind,
    title: `${g.title} | ${label}`,
    body,
    tags,
    url,
    photo: g.tool ? `${BASE}${g.tool.href}` : null,
  };
}

/** 올릴 순서: 홀덤 · 딜러 번갈아(하루 1편씩) */
export function blogDrafts(): BlogDraft[] {
  const holdem = HOLDEM_GUIDES.map((g) => draft("holdem", g));
  const dealer = GUIDE_ARTICLES.map((g) => draft("dealer", g));
  const out: BlogDraft[] = [];
  for (let i = 0; i < Math.max(holdem.length, dealer.length); i++) {
    if (holdem[i]) out.push(holdem[i]);
    if (dealer[i]) out.push(dealer[i]);
  }
  return out;
}
