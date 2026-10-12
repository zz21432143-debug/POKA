import { STREETS, type ActionId, type HandReviewData, type StreetAction, type StreetId } from "@/lib/hand-review";

/**
 * 핸드리뷰 베팅 계산기. 저장된 액션을 처음부터 다시 돌려서
 * 스트리트별 팟, 다음 차례, 콜 금액, 남은 스택을 구합니다.
 *
 * 금액 규칙(기존 데이터와 같음)
 * - bet · raise · allin: 그 스트리트에서 그 사람이 낸 "총액"(to)
 * - call: 이번에 "더 내는" 금액
 */

const PREFLOP_ORDER = ["UTG", "MP", "CO", "BTN", "SB", "BB"];
const POSTFLOP_ORDER = ["SB", "BB", "UTG", "MP", "CO", "BTN"];

/** 보드 카드 수: 이 스트리트를 하려면 보드가 몇 장 있어야 하는지 */
export const BOARD_NEEDED: Record<StreetId, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

export type ReplayStep = {
  street: StreetId;
  row: StreetAction;
  /** 이 액션 뒤 팟 */
  potAfter: number;
  /** 콜이면 더 낸 금액, 벳·레이즈면 총액 */
  amount: number;
};

export type BettingState = {
  /** 지금(다음 액션을 받을) 스트리트. 핸드가 끝났으면 null */
  street: StreetId | null;
  /** 다음에 행동할 자리. 없으면 null(스트리트 마감 또는 핸드 끝) */
  toAct: string | null;
  /** 이번 스트리트 최고 베팅(총액) */
  currentBet: number;
  /** 이번 스트리트에 각 자리가 낸 총액 */
  committed: Record<string, number>;
  /** 남은 스택 */
  remaining: Record<string, number>;
  folded: Set<string>;
  allIn: Set<string>;
  /** 지금까지 모인 팟(이번 스트리트 베팅 포함) */
  pot: number;
  /** 각 스트리트 시작 시점의 팟 */
  potAtStart: Partial<Record<StreetId, number>>;
  /** 진행 중인 사람이 1명 이하(나머지 폴드)로 핸드가 끝났는지 */
  handOver: boolean;
  /** 이번 스트리트 베팅이 끝나 다음 스트리트로 넘어갈 차례인지 */
  roundClosed: boolean;
  steps: ReplayStep[];
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function orderFor(street: StreetId, seats: string[]) {
  const base = street === "preflop" ? PREFLOP_ORDER : POSTFLOP_ORDER;
  return base.filter((id) => seats.includes(id));
}

/** 저장된 핸드를 처음부터 다시 돌립니다. 순서가 어긋난 예전 데이터도 멈추지 않고 끝까지 계산합니다. */
export function replayHand(hand: HandReviewData): BettingState {
  const seats = hand.seats.filter((seat) => seat.sitting).map((seat) => seat.id as string);
  const remaining: Record<string, number> = {};
  for (const seat of hand.seats) if (seat.sitting) remaining[seat.id] = seat.stackBb ?? hand.effectiveBb ?? 100;
  const folded = new Set<string>();
  const allIn = new Set<string>();
  const potAtStart: Partial<Record<StreetId, number>> = {};
  const steps: ReplayStep[] = [];
  let pot = 0;
  let committed: Record<string, number> = {};
  let currentBet = 0;

  const live = () => seats.filter((id) => !folded.has(id));
  const canAct = () => seats.filter((id) => !folded.has(id) && !allIn.has(id));

  const put = (id: string, total: number) => {
    const before = committed[id] ?? 0;
    const add = Math.max(0, Math.min(total - before, remaining[id] ?? 0));
    committed[id] = round1(before + add);
    remaining[id] = round1((remaining[id] ?? 0) - add);
    pot = round1(pot + add);
    if ((remaining[id] ?? 0) <= 0) allIn.add(id);
    return add;
  };

  // 블라인드(프리플랍 베팅으로 칩니다)
  for (const blind of hand.blinds) {
    if (!seats.includes(blind.actor)) continue;
    put(blind.actor, (committed[blind.actor] ?? 0) + (blind.amount ?? 0));
    currentBet = Math.max(currentBet, committed[blind.actor] ?? 0);
  }

  let street: StreetId = "preflop";
  let needToAct = new Set(canAct());
  let lastActor: string | null = null;

  for (const id of STREETS) {
    street = id;
    if (id !== "preflop") {
      committed = {};
      currentBet = 0;
      needToAct = new Set(canAct());
      lastActor = null;
    }
    potAtStart[id] = round1(pot);
    for (const row of hand.streets[id]) {
      const actor = row.actor;
      if (!seats.includes(actor)) continue;
      const mine = committed[actor] ?? 0;
      let amount = row.amount ?? 0;
      if (row.action === "fold") {
        folded.add(actor);
        needToAct.delete(actor);
      } else if (row.action === "check") {
        needToAct.delete(actor);
      } else if (row.action === "call") {
        // 금액이 비어 있으면 콜할 금액을 채웁니다.
        const toCall = Math.max(0, currentBet - mine);
        amount = row.amount ?? toCall;
        put(actor, mine + amount);
        needToAct.delete(actor);
      } else {
        // bet · raise · allin: 총액(to). 올인 금액이 없으면 남은 칩 전부.
        const total = row.action === "allin" && row.amount == null ? mine + (remaining[actor] ?? 0) : amount;
        put(actor, total);
        amount = committed[actor] ?? total;
        if ((committed[actor] ?? 0) > currentBet) {
          currentBet = committed[actor] ?? 0;
          needToAct = new Set(canAct().filter((seat) => seat !== actor));
        } else {
          needToAct.delete(actor);
        }
      }
      lastActor = actor;
      steps.push({ street: id, row, potAfter: pot, amount });
    }
    const last = id === "river" || hand.streets[STREETS[STREETS.indexOf(id) + 1]].length === 0;
    if (last) break;
  }

  const handOver = live().length <= 1;
  // 남은 사람이 모두 올인이거나 1명만 칠 수 있고 맞춰져 있으면 이번 스트리트는 끝입니다.
  const stillToAct = [...needToAct].filter((seat) => !folded.has(seat) && !allIn.has(seat));
  const roundClosed = !handOver && stillToAct.length === 0;

  let toAct: string | null = null;
  if (!handOver && !roundClosed) {
    const order = orderFor(street, seats);
    const start = lastActor ? order.indexOf(lastActor) + 1 : 0;
    for (let i = 0; i < order.length; i += 1) {
      const seat = order[(start + i) % order.length];
      if (stillToAct.includes(seat)) {
        toAct = seat;
        break;
      }
    }
  }

  return {
    street: handOver ? null : street,
    toAct,
    currentBet,
    committed,
    remaining,
    folded,
    allIn,
    pot,
    potAtStart,
    handOver,
    roundClosed,
    steps,
  };
}

/** 다음 스트리트(베팅이 끝났을 때). 리버 다음이면 null */
export function nextStreet(street: StreetId): StreetId | null {
  const index = STREETS.indexOf(street);
  return index >= 0 && index < STREETS.length - 1 ? STREETS[index + 1] : null;
}

export type LegalAction = { action: ActionId; label: string; amount?: number };

/** 지금 차례인 사람이 할 수 있는 액션(콜 금액은 계산해서 넣음) */
export function legalActions(state: BettingState, seat: string): LegalAction[] {
  const mine = state.committed[seat] ?? 0;
  const stack = state.remaining[seat] ?? 0;
  const toCall = round1(Math.max(0, state.currentBet - mine));
  const out: LegalAction[] = [];
  if (toCall > 0) {
    out.push({ action: "fold", label: "폴드" });
    if (toCall >= stack) {
      out.push({ action: "allin", label: `올인 콜 ${round1(stack)}`, amount: round1(mine + stack) });
      return out;
    }
    out.push({ action: "call", label: `콜 ${toCall}`, amount: toCall });
  } else {
    out.push({ action: "check", label: "체크" });
  }
  return out;
}

/** 벳·레이즈 빠른 크기(총액). 프리플랍 오픈은 2.5·3BB, 레이즈는 2.5·3배, 플랍 이후 벳은 팟의 33·50·75·100% */
export function sizePresets(state: BettingState, seat: string): { label: string; total: number }[] {
  const mine = state.committed[seat] ?? 0;
  const cap = round1(mine + (state.remaining[seat] ?? 0));
  const half = (value: number) => Math.round(value * 2) / 2;
  let presets: { label: string; total: number }[];
  if (state.street === "preflop") {
    presets =
      state.currentBet <= 1
        ? [
            { label: "2.5BB", total: 2.5 },
            { label: "3BB", total: 3 },
          ]
        : [
            { label: "2.5배", total: half(state.currentBet * 2.5) },
            { label: "3배", total: half(state.currentBet * 3) },
          ];
  } else if (state.currentBet > 0) {
    presets = [
      { label: "2.5배", total: half(state.currentBet * 2.5) },
      { label: "3배", total: half(state.currentBet * 3) },
    ];
  } else {
    presets = [0.33, 0.5, 0.75, 1].map((ratio) => ({
      label: ratio === 1 ? "팟" : `${Math.round(ratio * 100)}%`,
      total: Math.max(1, half(state.pot * ratio)),
    }));
  }
  return presets.filter((preset) => preset.total > state.currentBet && preset.total < cap);
}

/** 벳(앞 베팅 없음)인지 레이즈인지 */
export function aggressiveAction(state: BettingState): ActionId {
  return state.currentBet > 0 ? "raise" : "bet";
}

export type NextTurn = {
  state: BettingState;
  /** 다음 액션을 넣을 스트리트 */
  street: StreetId | null;
  toAct: string | null;
  /** 더 넣을 액션이 없는 이유: fold(한 명 빼고 폴드) · allin(모두 올인) · showdown(리버까지 끝) */
  done: "fold" | "allin" | "showdown" | null;
  /** 다음 스트리트를 하려면 보드가 더 필요함 */
  needBoard: number;
};

/** 글쓰기용: 다음에 누가, 어느 스트리트에서 행동하는지. 베팅이 끝났으면 다음 스트리트로 넘깁니다. */
export function nextTurn(hand: HandReviewData): NextTurn {
  const state = replayHand(hand);
  if (state.handOver) return { state, street: null, toAct: null, done: "fold", needBoard: 0 };
  if (!state.roundClosed && state.street) return { state, street: state.street, toAct: state.toAct, done: null, needBoard: 0 };
  const next = state.street ? nextStreet(state.street) : null;
  if (!next) return { state, street: null, toAct: null, done: "showdown", needBoard: 0 };
  const seats = hand.seats.filter((seat) => seat.sitting).map((seat) => seat.id as string);
  const active = orderFor(next, seats).filter((id) => !state.folded.has(id) && !state.allIn.has(id));
  if (active.length < 2) return { state, street: next, toAct: null, done: "allin", needBoard: 0 };
  const fresh: BettingState = { ...state, street: next, committed: {}, currentBet: 0, roundClosed: false, toAct: active[0] };
  const needBoard = Math.max(0, BOARD_NEEDED[next] - hand.board.length);
  return { state: fresh, street: next, toAct: active[0], done: null, needBoard };
}
