/**
 * 구인 글 「근무 환경」 칩: 공고마다 고르는 짧은 표시(초보 가능 · 유급 교육 …).
 * 공고 페이지 · 검색 설명에 함께 보여 공고 내용이 풍부해집니다. 저장은 「,」로 이은 문자열.
 */
export const JOB_TAGS = [
  "초보 가능",
  "유급 교육",
  "장기 근무 우대",
  "휴게실 있음",
  "식사 제공",
  "주차 가능",
  "역 근처",
  "야간 귀가 지원",
  "로테이션 휴식",
  "토너먼트 위주",
  "링게임 위주",
  "유니폼 제공",
] as const;

export function normalizeJobTags(raw: unknown): string | null {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const picked = JOB_TAGS.filter((tag) => list.some((v) => String(v).trim() === tag));
  return picked.length ? picked.join(",") : null;
}

export function parseJobTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter((v) => (JOB_TAGS as readonly string[]).includes(v));
}
