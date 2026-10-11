/** TDA 룰 문서 보기 도우미. 순서 정렬, 조항 머리줄 판별, 검색 위치 찾기. */
export type TdaSection = { id: string; title: string; content: string; createdAt: string };

function leadingNumber(title: string): number | null {
  const m = title.match(/(?:^|제\s*|rule\s*|#)\s*(\d{1,4})/i);
  return m ? Number(m[1]) : null;
}

/** 제목 앞 번호(1조, Rule 3, 10. …) 순서, 번호가 없으면 올린 순서. */
export function sortTdaSections<T extends { title: string; createdAt: string }>(sections: T[]): T[] {
  return [...sections].sort((a, b) => {
    const na = leadingNumber(a.title);
    const nb = leadingNumber(b.title);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/** 조항 머리줄: "1.", "12)", "제3조", "Rule 4", "RULE 4:" 로 시작하는 짧은 줄 */
export function isRuleHeading(line: string) {
  const t = line.trim();
  return t.length > 0 && t.length <= 80 && /^(\d{1,3}\s*[.)]\s|제\s*\d+\s*조|rule\s*\d+)/i.test(t);
}

/**
 * 글 속에서 검색어가 나오는 위치들. 대소문자와 띄어쓰기를 무시합니다
 * ("올인"으로 "올 인", "all in"으로 "allin"도 찾음 — PDF에서 줄이 끊겨 생긴 띄어쓰기 대비).
 */
export function findMatches(text: string, query: string): { start: number; end: number }[] {
  const chars = [...query.replace(/\s+/g, "")];
  if (chars.length === 0) return [];
  const pattern = chars.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
  const re = new RegExp(pattern, "giu");
  const out: { start: number; end: number }[] = [];
  for (const m of text.matchAll(re)) {
    if (out.length >= 2000) break;
    out.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}
