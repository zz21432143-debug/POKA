import { findProfanity } from "@/lib/profanity";

/**
 * 검색(구글) · 광고(애드센스)에 내보낼 만한 글인지 가릅니다.
 * - 자유게시판 · 질문 같은 짧은 글(인사 · 한 줄)은 내용이 없는 페이지로 보여 사이트 평가를 깎으므로 검색 제외
 * - 욕설 · 성적 표현이 들어간 글도 검색 제외 · 광고 없음
 * 글은 그대로 보이고, 검색 결과와 광고에서만 빠집니다.
 */
export const THIN_MIN_CHARS = 120;
const LENGTH_CHECKED = new Set(["FREE", "RULE_QA", "SUGGESTION", "TALENT", "PICKUP"]);

export function plainPostText(content: string | null | undefined) {
  return (content ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function postIsThin(post: { boardType: string; title: string; content: string | null | undefined }) {
  if (post.boardType === "JOBS") return false;
  const text = plainPostText(post.content);
  if (LENGTH_CHECKED.has(post.boardType) && text.length < THIN_MIN_CHARS) return true;
  return Boolean(findProfanity(`${post.title}\n${text}`));
}

/** 같은 사람이 같은 분류로 올린 구인 글은 가장 최근 1개만 검색에(지점만 바꾼 비슷한 글이 많음) */
export function latestJobPerAuthor<T extends { authorId: string | null; jobKind: string | null; id: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.authorId ?? row.id}:${row.jobKind ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
