import type { BoardType } from "@/generated/prisma/enums";

/** 좋은 답변 채택을 쓰는 게시판(질문하고 답하는 곳) */
export const ACCEPT_BOARDS: ReadonlySet<BoardType> = new Set(["HAND_REVIEW", "RULE_QA", "TDA"]);
/** 채택된 답변자 보상 */
export const ACCEPT_POINTS = 30;
export const ACCEPT_EXP = 10;
/** 답변자 한 사람이 하루에 보상받는 채택 수(넘으면 채택 표시만) */
export const ACCEPT_DAILY_MAX = 3;
/** 같은 글쓴이가 같은 답변자를 채택해 보상이 나가는 간격(친구끼리 주고받기 막기) */
export const ACCEPT_PAIR_DAYS = 7;

export type AcceptCheck =
  | { ok: true }
  | { ok: false; error: string };

/** 채택할 수 있는지: 글쓴이만 · 남의 댓글만 · 채택 게시판만 · 글 하나에 한 번 */
export function canAccept(input: {
  viewerId: string;
  postAuthorId: string | null;
  boardType: BoardType;
  commentAuthorId: string | null;
  alreadyAccepted: boolean;
}): AcceptCheck {
  if (!ACCEPT_BOARDS.has(input.boardType)) return { ok: false, error: "이 게시판은 답변 채택을 쓰지 않아요." };
  if (input.postAuthorId !== input.viewerId) return { ok: false, error: "글쓴이만 채택할 수 있어요." };
  if (!input.commentAuthorId) return { ok: false, error: "탈퇴한 회원의 댓글은 채택할 수 없어요." };
  if (input.commentAuthorId === input.viewerId) return { ok: false, error: "내 댓글은 채택할 수 없어요." };
  if (input.alreadyAccepted) return { ok: false, error: "이미 채택한 답변이 있어요(글 하나에 하나만)." };
  return { ok: true };
}

/** 보상이 나가는지: 답변자 하루 ACCEPT_DAILY_MAX번 · 같은 글쓴이 → 같은 답변자 ACCEPT_PAIR_DAYS일에 한 번 */
export function acceptRewarded(input: { answererAcceptsToday: number; samePairRecently: boolean }) {
  return input.answererAcceptsToday < ACCEPT_DAILY_MAX && !input.samePairRecently;
}

/** 질문 틀(글쓰기에서 한 번 눌러 넣기) — 답하는 사람이 필요한 정보를 빠뜨리지 않게 */
export const QUESTION_TEMPLATES: Partial<Record<BoardType, string>> = {
  HAND_REVIEW: "❓ 궁금한 곳: (예: 리버 콜이 맞았는지)\n🧠 내가 한 선택과 이유: \n🙋 상대에 대해 아는 것(성향 · 앞 핸드): ",
  RULE_QA: "📍 상황: (몇 명 · 누가 어떤 액션 · 칩 크기)\n⚖️ 실제로 어떻게 처리됐나요: \n❓ 궁금한 점: ",
  TDA: "📍 상황: (몇 명 · 누가 어떤 액션 · 칩 크기)\n⚖️ 실제로 어떻게 처리됐나요: \n❓ 궁금한 점(룰 번호를 알면 같이): ",
};

/** 자유게시판 「오늘의 한 판」: 제목 앞 태그 · 본문 틀(금액 대신 칩 · bb) */
export const HAND_OF_DAY_TAG = "[오늘의 한 판]";
export const HAND_OF_DAY_TEMPLATE = "🃏 상황: (블라인드 · 내 스택 몇 bb · 자리 · 내 패)\n🔥 어떻게 됐나요: \n💬 한 줄 소감: \n(금액 대신 칩 · bb로 써 주세요)";
