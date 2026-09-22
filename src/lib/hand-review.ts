export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export const SUITS = [
  { code: "s", label: "♠", name: "스페이드" },
  { code: "h", label: "♥", name: "하트" },
  { code: "d", label: "♦", name: "다이아" },
  { code: "c", label: "♣", name: "클럽" },
] as const;

export const POSITIONS = ["UTG", "MP", "CO", "BTN", "SB", "BB"] as const;
export const STREETS = ["preflop", "flop", "turn", "river"] as const;
export const ACTIONS = ["fold", "check", "call", "bet", "raise", "allin"] as const;

export type StreetId = (typeof STREETS)[number];
export type ActionId = (typeof ACTIONS)[number];
export type ActorId = "Hero" | "Villain";

export type StreetAction = {
  actor: ActorId;
  action: ActionId;
  amount?: number;
};

export type HandReviewData = {
  heroPosition: string;
  villainPosition: string;
  heroCards: string[];
  villainCards: string[];
  board: string[];
  streets: Record<StreetId, StreetAction[]>;
  effectiveBb?: number;
};

export const EMPTY_HAND: HandReviewData = {
  heroPosition: "BTN",
  villainPosition: "BB",
  heroCards: [],
  villainCards: [],
  board: [],
  streets: { preflop: [], flop: [], turn: [], river: [] },
  effectiveBb: 100,
};

export const STREET_LABEL: Record<StreetId, string> = {
  preflop: "프리플랍",
  flop: "플랍",
  turn: "턴",
  river: "리버",
};

export const ACTION_LABEL: Record<ActionId, string> = {
  fold: "Fold",
  check: "Check",
  call: "Call",
  bet: "Bet",
  raise: "Raise",
  allin: "All-in",
};

const CARD_RE = /^([AKQJT2-9])([shdc])$/;

export function allCardCodes(): string[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit.code}`));
}

export function parseCard(code: string): { rank: string; suit: string; red: boolean } | null {
  const match = CARD_RE.exec(code);
  if (!match) return null;
  const rank = match[1] === "T" ? "10" : match[1];
  const suit = match[2];
  return { rank, suit, red: suit === "h" || suit === "d" };
}

export function suitGlyph(suit: string): string {
  return SUITS.find((row) => row.code === suit)?.label ?? suit;
}

export function parseHandReview(raw: string | null | undefined): HandReviewData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as HandReviewData;
    if (!Array.isArray(data.heroCards) || !Array.isArray(data.board)) return null;
    return {
      ...EMPTY_HAND,
      ...data,
      streets: {
        ...EMPTY_HAND.streets,
        ...(data.streets ?? {}),
      },
    };
  } catch {
    return null;
  }
}

export function validateHandReview(data: HandReviewData): string | null {
  if (data.heroCards.length !== 2) return "내 손패 두 장을 선택하세요.";
  if (new Set([...data.heroCards, ...data.villainCards, ...data.board]).size !==
    data.heroCards.length + data.villainCards.length + data.board.length) {
    return "같은 카드가 중복되었습니다.";
  }
  if (data.board.length > 5) return "보드는 최대 5장입니다.";
  const actionCount = STREETS.reduce((sum, street) => sum + data.streets[street].length, 0);
  if (actionCount === 0) return "배팅 라인을 한 줄 이상 입력하세요.";
  return null;
}

export function boardForStreet(board: string[], street: StreetId): string[] {
  if (street === "preflop") return [];
  if (street === "flop") return board.slice(0, 3);
  if (street === "turn") return board.slice(0, 4);
  return board.slice(0, 5);
}
