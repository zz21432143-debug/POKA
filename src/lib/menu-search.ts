import { SIDEBAR_NAV } from "@/lib/nav";

/** 검색어로 메뉴 찾기: 「출석」 · 「상점」 · 「로테이션」처럼 메뉴 이름을 치면 그 메뉴로 바로 가게 */
export type MenuHit = { href: string; label: string; hint: string; group: string };

/** 사람들이 흔히 쓰는 다른 말 → 메뉴 주소 */
const ALIASES: Record<string, string[]> = {
  "/attendance": ["출첵", "출석", "출석부", "체크인"],
  "/tools/rotation": ["교대", "교대표", "로테", "스케줄"],
  "/tools/board": ["타이머", "블라인드", "현황판", "tv"],
  "/tools/shot-clock": ["샷클락", "샷클럭", "타이머", "시간"],
  "/tools/pay": ["급여", "월급", "시급", "실수령", "3.3"],
  "/tools/seat-draw": ["좌석", "자리배정", "싯드로우", "시드로우"],
  "/boards/tda": ["룰", "규칙", "tda"],
  "/shop": ["상점", "마크", "변경권", "닉네임변경"],
  "/invite": ["초대", "추천"],
  "/boards/jobs": ["구인", "구직", "알바", "일자리"],
  "/boards/jobs/slots": ["빈자리", "오늘"],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s·]/g, "");

let all: MenuHit[] | null = null;
function menus() {
  if (all) return all;
  const seen = new Set<string>();
  all = [];
  for (const g of SIDEBAR_NAV) {
    const group = g.title ?? "";
    if (g.hub && g.title && !seen.has(g.hub)) {
      seen.add(g.hub);
      all.push({ href: g.hub, label: g.title, hint: "모음 화면", group });
    }
    for (const item of g.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      all.push({ href: item.href, label: item.label, hint: item.hint ?? "", group });
    }
  }
  return all;
}

/** 검색어에 맞는 메뉴(최대 6개, 이름이 맞는 것 먼저) */
export function searchMenus(query: string): MenuHit[] {
  const q = norm(query);
  if (q.length < 1) return [];
  const scored = menus()
    .map((m) => {
      const label = norm(m.label);
      const alias = (ALIASES[m.href] ?? []).some((a) => norm(a).includes(q) || q.includes(norm(a)));
      const score = label === q ? 4 : label.includes(q) ? 3 : alias ? 2 : norm(m.hint).includes(q) ? 1 : 0;
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 6).map((x) => x.m);
}
