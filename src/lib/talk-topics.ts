import { todayKstDate } from "@/lib/dates";

/**
 * 오늘의 이야기거리: 홈 「글쓰기」 줄에 날마다 하나씩 — 회원 글을 늘리려고(쓸 거리를 먼저 던짐).
 * 누르면 자유게시판 글쓰기 제목에 미리 들어감(?topic=번호, 이 목록에 있는 것만).
 */
export const TALK_TOPICS = [
  "오늘 테이블에서 가장 기억에 남는 핸드는?",
  "딜러 하면서 제일 당황했던 순간은?",
  "처음 홀덤 배울 때 가장 헷갈렸던 룰은?",
  "제일 좋아하는 시작 패와 그 이유는?",
  "쿨러(어쩔 수 없이 지는 판) 당한 이야기",
  "토너먼트 버블 직전, 어떻게 플레이하세요?",
  "매장에서 손님이 가장 많이 묻는 질문은?",
  "셔플 · 피치 연습은 어떻게 하세요?",
  "블러프 성공(또는 실패)한 이야기",
  "초보에게 꼭 해 주고 싶은 조언 한 가지",
  "요즘 가 본 대회 · 매장 분위기 어땠나요?",
  "플로어를 불러야 했던 애매한 상황",
  "핸드 끝나고 「그때 접을걸」 했던 순간",
  "가장 좋아하는 블라인드 구조(레벨 시간)는?",
  "딜러 첫 출근 날 이야기",
  "홀덤 공부할 때 쓰는 방법 · 도구",
  "테이블 매너, 이것만은 지켜 줬으면 하는 것",
  "리버에서 가장 어려웠던 콜 · 폴드 결정",
  "쇼트 스택일 때 나만의 플레이",
  "오늘의 한 줄 근황",
] as const;

/** 오늘(한국 날짜) 이야기거리 번호 */
export function todayTopicIndex(day = todayKstDate()) {
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return ((n % TALK_TOPICS.length) + TALK_TOPICS.length) % TALK_TOPICS.length;
}

/** 주소의 ?topic= 값 → 이야기거리(목록에 없으면 null) */
export function topicFromParam(value: string | undefined) {
  if (!value || !/^\d{1,2}$/.test(value)) return null;
  return TALK_TOPICS[Number(value)] ?? null;
}
