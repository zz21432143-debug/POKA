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
export type SeatId = (typeof POSITIONS)[number];
export type ActorId = string;

export type StreetAction = {
  actor: ActorId;
  action: ActionId;
  amount?: number;
};

export type SeatState = {
  id: SeatId;
  stackBb: number;
  sitting: boolean;
  isHero?: boolean;
  cards: string[];
  showCards?: boolean;
};

export type HandReviewData = {
  heroPosition: string;
  villainPosition: string;
  heroCards: string[];
  villainCards: string[];
  board: string[];
  streets: Record<StreetId, StreetAction[]>;
  blinds: StreetAction[];
  seats: SeatState[];
  effectiveBb?: number;
  potBb?: number;
  winnerSeat?: string | null;
  streetPots?: Partial<Record<StreetId, number>>;
};

export function defaultBlinds(sittingIds: string[]): StreetAction[] {
  const sitting = new Set(sittingIds);
  if (!sitting.has("SB") && sitting.has("BTN") && sitting.has("BB")) {
    return [
      { actor: "BTN", action: "bet", amount: 0.5 },
      { actor: "BB", action: "bet", amount: 1 },
    ];
  }
  return [
    { actor: "SB", action: "bet", amount: 0.5 },
    { actor: "BB", action: "bet", amount: 1 },
  ];
}

export const EMPTY_HAND: HandReviewData = {
  heroPosition: "BB",
  villainPosition: "BTN",
  heroCards: [],
  villainCards: [],
  board: [],
  streets: { preflop: [], flop: [], turn: [], river: [] },
  blinds: defaultBlinds(["BTN", "BB"]),
  seats: POSITIONS.map((id) => ({
    id,
    stackBb: 100,
    sitting: id === "BB" || id === "BTN",
    isHero: id === "BB",
    cards: [],
    showCards: id === "BB",
  })),
  effectiveBb: 100,
  potBb: 1.5,
  winnerSeat: null,
};

export const STREET_LABEL: Record<StreetId, string> = {
  preflop: "프리플랍",
  flop: "플랍",
  turn: "턴",
  river: "리버",
};

export const STREET_LABEL_KO: Record<StreetId, string> = {
  preflop: "프리플랍",
  flop: "플랍",
  turn: "턴",
  river: "리버",
};

export const ACTION_LABEL: Record<ActionId, string> = {
  fold: "폴드",
  check: "체크",
  call: "콜",
  bet: "벳",
  raise: "레이즈",
  allin: "올인",
};

export const ACTION_LABEL_KO = ACTION_LABEL;

export const POSITION_LABEL: Record<SeatId, string> = {
  UTG: "UTG 언더",
  MP: "MP 미들",
  CO: "CO 컷오프",
  BTN: "BTN 버튼",
  SB: "SB 스몰",
  BB: "BB 빅블라인드",
};

export function actorLabel(actor: string, hand: HandReviewData): string {
  const seat = resolveActorSeat(actor, hand);
  if (seat === hand.heroPosition) return `나 (${seat})`;
  const others = sittingSeats(hand).filter((row) => !row.isHero && row.id !== hand.heroPosition);
  if (others.length === 1 && seat === others[0]?.id) return `상대 (${seat})`;
  return seat;
}

export function formatActionLine(row: StreetAction, hand: HandReviewData): string {
  const amount = row.amount != null ? ` ${formatBb(row.amount)}` : "";
  return `${actorLabel(row.actor, hand)} ${ACTION_LABEL[row.action]}${amount}`;
}

export type TimelineGroup = {
  street: StreetId | "blinds";
  label: string;
  pot?: number;
  rows: StreetAction[];
};

export function actionTimeline(hand: HandReviewData): TimelineGroup[] {
  return [
    { street: "blinds", label: "블라인드", rows: hand.blinds },
    { street: "preflop", label: STREET_LABEL_KO.preflop, pot: hand.streetPots?.preflop, rows: hand.streets.preflop },
    { street: "flop", label: STREET_LABEL_KO.flop, pot: hand.streetPots?.flop, rows: hand.streets.flop },
    { street: "turn", label: STREET_LABEL_KO.turn, pot: hand.streetPots?.turn, rows: hand.streets.turn },
    {
      street: "river",
      label: STREET_LABEL_KO.river,
      pot: hand.streetPots?.river ?? hand.potBb,
      rows: hand.streets.river,
    },
  ];
}

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

export function formatBb(amount?: number) {
  if (amount == null || Number.isNaN(amount)) return "";
  const rounded = Math.round(amount * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} BB`;
}

export function resolveActorSeat(actor: string, hand: HandReviewData): string {
  if (actor === "Hero") return hand.heroPosition;
  if (actor === "Villain") return hand.villainPosition;
  return actor;
}

export function sittingSeats(hand: HandReviewData): SeatState[] {
  return hand.seats.filter((seat) => seat.sitting);
}

/** Hero를 맨 아래 두고 시계 반대 방향으로 자리를 돌립니다. */
export function seatsAroundHero(hand: HandReviewData): SeatState[] {
  const seats = sittingSeats(hand);
  if (seats.length === 0) return [];
  const heroIndex = Math.max(
    0,
    seats.findIndex((seat) => seat.isHero || seat.id === hand.heroPosition),
  );
  return [...seats.slice(heroIndex), ...seats.slice(0, heroIndex)];
}

const SLOT_STYLE: Array<{ left: string; top: string }> = [
  { left: "50%", top: "86%" },
  { left: "11%", top: "58%" },
  { left: "18%", top: "16%" },
  { left: "50%", top: "7%" },
  { left: "82%", top: "16%" },
  { left: "89%", top: "58%" },
];

export function tableSlotStyle(index: number, total: number): { left: string; top: string } {
  if (total <= 1) return SLOT_STYLE[0];
  if (total === 2) return index === 0 ? SLOT_STYLE[0] : SLOT_STYLE[3];
  if (total === 3) return [SLOT_STYLE[0], SLOT_STYLE[2], SLOT_STYLE[4]][index] ?? SLOT_STYLE[0];
  if (total === 4) return [SLOT_STYLE[0], SLOT_STYLE[1], SLOT_STYLE[3], SLOT_STYLE[5]][index] ?? SLOT_STYLE[0];
  if (total === 5) return [SLOT_STYLE[0], SLOT_STYLE[1], SLOT_STYLE[2], SLOT_STYLE[3], SLOT_STYLE[4]][index] ?? SLOT_STYLE[0];
  return SLOT_STYLE[index] ?? SLOT_STYLE[0];
}

function defaultSeats(heroPosition: string, villainPosition: string, effectiveBb: number): SeatState[] {
  const hero = POSITIONS.includes(heroPosition as SeatId) ? (heroPosition as SeatId) : "BB";
  const villain = POSITIONS.includes(villainPosition as SeatId) ? (villainPosition as SeatId) : "BTN";
  return POSITIONS.map((id) => ({
    id,
    stackBb: effectiveBb,
    sitting: id === hero || id === villain,
    isHero: id === hero,
    cards: [],
    showCards: id === hero,
  }));
}

export function normalizeHand(data: Partial<HandReviewData> | null | undefined): HandReviewData {
  const incoming = data ?? {};
  const heroPosition = incoming.heroPosition || "BB";
  const villainPosition = incoming.villainPosition || "BTN";
  const effectiveBb = incoming.effectiveBb ?? 100;
  const incomingSeats = Array.isArray(incoming.seats) && incoming.seats.length > 0 ? incoming.seats : null;
  let seats =
    incomingSeats
      ? POSITIONS.map((id) => {
          const found = incomingSeats.find((seat) => seat.id === id);
          return {
            id,
            stackBb: found?.stackBb ?? effectiveBb,
            sitting: found?.sitting ?? false,
            isHero: found?.isHero ?? id === heroPosition,
            cards: found?.cards ?? [],
            showCards: found?.showCards ?? false,
          } satisfies SeatState;
        })
      : defaultSeats(heroPosition, villainPosition, effectiveBb);

  seats = seats.map((seat) => {
    if (seat.id === heroPosition) {
      return {
        ...seat,
        sitting: true,
        isHero: true,
        cards: incoming.heroCards?.length ? incoming.heroCards : seat.cards,
        showCards: true,
      };
    }
    if (seat.id === villainPosition && incoming.villainCards?.length) {
      return {
        ...seat,
        sitting: true,
        isHero: false,
        cards: seat.cards.length ? seat.cards : incoming.villainCards,
        showCards: seat.showCards || incoming.villainCards.length === 2,
      };
    }
    return { ...seat, isHero: seat.id === heroPosition };
  });

  const hero = seats.find((seat) => seat.isHero);
  const villain = seats.find((seat) => seat.id === villainPosition && !seat.isHero) ?? seats.find((seat) => !seat.isHero && seat.sitting);

  return {
    ...EMPTY_HAND,
    ...incoming,
    heroPosition,
    villainPosition: villain?.id ?? villainPosition,
    heroCards: hero?.cards?.length ? hero.cards : incoming.heroCards ?? [],
    villainCards: villain?.cards?.length ? villain.cards : incoming.villainCards ?? [],
    board: Array.isArray(incoming.board) ? incoming.board.slice(0, 5) : [],
    streets: {
      preflop: incoming.streets?.preflop ?? [],
      flop: incoming.streets?.flop ?? [],
      turn: incoming.streets?.turn ?? [],
      river: incoming.streets?.river ?? [],
    },
    blinds: Array.isArray(incoming.blinds) ? incoming.blinds : EMPTY_HAND.blinds,
    seats,
    effectiveBb,
    potBb: incoming.potBb,
    winnerSeat: incoming.winnerSeat ?? null,
    streetPots: incoming.streetPots,
  };
}

export function parseHandReview(raw: string | null | undefined): HandReviewData | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<HandReviewData>;
    if (!data || typeof data !== "object") return null;
    return normalizeHand({
      ...data,
      heroCards: Array.isArray(data.heroCards) ? data.heroCards : [],
      villainCards: Array.isArray(data.villainCards) ? data.villainCards : [],
      board: Array.isArray(data.board) ? data.board : [],
    });
  } catch {
    return null;
  }
}

function allUsedCards(data: HandReviewData) {
  const seatCards = data.seats.filter((seat) => seat.sitting).flatMap((seat) => seat.cards);
  if (seatCards.length > 0) return [...seatCards, ...data.board];
  return [...data.heroCards, ...data.villainCards, ...data.board];
}

export function validateHandReview(data: HandReviewData): string | null {
  const hand = normalizeHand(data);
  if (hand.heroCards.length !== 2) return "내 손패 두 장을 선택하세요.";
  const used = allUsedCards(hand);
  if (new Set(used).size !== used.length) return "같은 카드가 중복되었습니다.";
  if (hand.board.length > 5) return "보드는 최대 5장입니다.";
  const actionCount =
    hand.blinds.length + STREETS.reduce((sum, street) => sum + hand.streets[street].length, 0);
  if (actionCount === 0) return "배팅 라인을 한 줄 이상 입력하세요.";
  return null;
}

export function boardForStreet(board: string[], street: StreetId): string[] {
  if (street === "preflop") return [];
  if (street === "flop") return board.slice(0, 3);
  if (street === "turn") return board.slice(0, 4);
  return board.slice(0, 5);
}

export function actionChipClass(action: ActionId) {
  if (action === "fold") return "bg-[#3a3f46] text-zinc-200";
  if (action === "check" || action === "call") return "bg-white text-zinc-900";
  return "bg-[#e6b325] text-zinc-900";
}

/** 스크린샷에 가까운 5핸드 샘플. 상대(UTG) 핸드 공개. */
export const SAMPLE_TABLE_HAND: HandReviewData = normalizeHand({
  heroPosition: "BB",
  villainPosition: "UTG",
  heroCards: ["Ks", "Qs"],
  villainCards: ["Ah", "Td"],
  board: ["9h", "As", "Tc", "Jh", "Ac"],
  effectiveBb: 100,
  potBb: 37.2,
  winnerSeat: "UTG",
  streetPots: { preflop: 1.4, flop: 4.4, turn: 22.4, river: 37.2 },
  blinds: [
    { actor: "SB", action: "bet", amount: 0.4 },
    { actor: "BB", action: "bet", amount: 1 },
  ],
  streets: {
    preflop: [
      { actor: "UTG", action: "raise", amount: 2 },
      { actor: "CO", action: "fold" },
      { actor: "BTN", action: "fold" },
      { actor: "SB", action: "fold" },
      { actor: "BB", action: "call", amount: 1 },
    ],
    flop: [
      { actor: "UTG", action: "check" },
      { actor: "BB", action: "bet", amount: 1.6 },
      { actor: "UTG", action: "raise", amount: 9 },
      { actor: "BB", action: "call", amount: 7.4 },
    ],
    turn: [
      { actor: "UTG", action: "bet", amount: 7.4 },
      { actor: "BB", action: "call", amount: 7.4 },
    ],
    river: [
      { actor: "UTG", action: "check" },
      { actor: "BB", action: "bet", amount: 27.9 },
      { actor: "UTG", action: "call", amount: 27.9 },
    ],
  },
  seats: [
    { id: "UTG", sitting: true, stackBb: 167.9, cards: ["Ah", "Td"], showCards: true, isHero: false },
    { id: "MP", sitting: false, stackBb: 100, cards: [], showCards: false },
    { id: "CO", sitting: true, stackBb: 102.6, cards: [], showCards: false },
    { id: "BTN", sitting: true, stackBb: 100, cards: [], showCards: false },
    { id: "SB", sitting: true, stackBb: 32.6, cards: [], showCards: false },
    { id: "BB", sitting: true, stackBb: 81.6, cards: ["Ks", "Qs"], showCards: true, isHero: true },
  ],
});
