/**
 * 딜러 로테이션 시간표 짜기(DB 없이 계산만).
 *
 * 시간은 "그날 0시부터 몇 분"(분 단위 정수)으로 다룹니다. 밤샘 대회처럼 시작보다 이른 시각은 다음 날(+1440)로 봅니다.
 *
 * 한 칸(예: 20분)마다
 * 1) 그 시각에 일할 수 있는 딜러(출근 이후 · 퇴근 전 · 휴무 아님)를 고르고
 * 2) 테이블 수만큼 근무, 나머지는 휴식. 계속 일하던 딜러는 정해진 횟수(cap)까지 이어서 일하고, 오래 쉰 딜러부터 들어옵니다.
 *    cap = 테이블 수 ÷ 휴식 인원(반올림) → 모두가 cap칸 일하고 1칸 쉬는 흐름이 고르게 돕니다.
 * 3) 이어서 일하는 딜러는 다음 테이블로 한 칸씩 이동(T1→T2…), 비는 테이블은 들어오는 딜러가 채웁니다.
 */

export type PlanDealer = {
  id: string;
  /** 일할 수 있는 첫 시각(분) */
  from: number;
  /** 이 시각부터는 못 함(퇴근). 없으면 끝까지 */
  to: number | null;
};

export type PlanSlot = {
  /** 이 칸이 시작하는 시각(분) */
  at: number;
  /** 테이블별 딜러 id(인덱스 0 = T1). 사람이 모자라면 null */
  seats: (string | null)[];
  /** 휴식 중인 딜러 id */
  rest: string[];
};

export type RotationPlan = {
  /** 게임 시작 시각(분). 세팅 칸은 이보다 setup분 앞 */
  start: number;
  end: number;
  interval: number;
  tables: number;
  slots: PlanSlot[];
  /** 세팅 칸 길이(분). 0이면 없음 */
  setup?: number;
};

export const MINUTES_PER_DAY = 1440;

/** "10:00" → 600. 못 읽으면 null */
export function parseClock(value: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 600 → "10:00", 1500 → "01:00"(다음 날) */
export function formatClock(minutes: number) {
  const m = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 시작 시각 기준으로 밤샘을 펴 줍니다: 시작보다 6시간 넘게 이른 시각은 다음 날로 */
export function alignToStart(minutes: number, start: number) {
  return minutes < start - 360 ? minutes + MINUTES_PER_DAY : minutes;
}

type DealerState = { lastTable: number | null; streak: number; restStreak: number; work: number };

function availableAt(dealer: PlanDealer, at: number) {
  return dealer.from <= at && (dealer.to == null || dealer.to > at);
}

/**
 * 시간표 짜기. keep에 이미 정해 둔 앞부분 칸을 주면 그대로 두고, 그 흐름을 이어서 뒤 칸만 새로 짭니다(이후 다시 짜기).
 */
export function buildPlan(options: {
  dealers: PlanDealer[];
  tables: number;
  start: number;
  end: number;
  interval: number;
  keep?: PlanSlot[];
  /** 게임 시작 전 세팅 칸(분). 예: 30이면 시작 30분 전에 세팅 칸 하나를 두고, 시작부터 간격대로 돕니다. */
  setup?: number;
}): RotationPlan {
  const tables = Math.max(1, Math.floor(options.tables));
  const interval = Math.max(5, Math.floor(options.interval));
  const start = options.start;
  const end = options.end > start ? options.end : options.end + MINUTES_PER_DAY;
  const order = new Map(options.dealers.map((d, i) => [d.id, i]));
  const state = new Map<string, DealerState>(
    options.dealers.map((d) => [d.id, { lastTable: null, streak: 0, restStreak: Number.POSITIVE_INFINITY, work: 0 }]),
  );

  const slots: PlanSlot[] = [];
  const record = (slot: PlanSlot) => {
    const working = new Set<string>();
    slot.seats.forEach((id, table) => {
      if (!id) return;
      working.add(id);
      const s = state.get(id);
      if (!s) return;
      s.streak = s.lastTable != null ? s.streak + 1 : 1;
      s.lastTable = table;
      s.restStreak = 0;
      s.work += 1;
    });
    for (const [id, s] of state) {
      if (working.has(id)) continue;
      s.lastTable = null;
      s.streak = 0;
      s.restStreak = s.restStreak === Number.POSITIVE_INFINITY ? 1 : s.restStreak + 1;
    }
    slots.push(slot);
  };

  const setup = Math.max(0, Math.floor(options.setup ?? 0));
  const first = start - setup;
  const keep = (options.keep ?? []).filter((slot) => slot.at >= first && slot.at < end);
  for (const slot of keep) record({ at: slot.at, seats: slot.seats.slice(0, tables).concat(Array(Math.max(0, tables - slot.seats.length)).fill(null)), rest: slot.rest });

  // 칸 시각: (세팅 칸) + 시작부터 간격마다. 이미 둔 칸(keep) 다음부터 짭니다.
  const times: number[] = [];
  if (setup > 0) times.push(first);
  const lastKept = keep.length ? keep[keep.length - 1].at : Number.NEGATIVE_INFINITY;
  if (keep.length) {
    // 이어 짜기: 마지막으로 둔 칸 + 간격부터(시간을 손으로 바꿔 간격이 어긋났어도 그 뒤부터 맞춤)
    for (let at = lastKept + interval; at < end; at += interval) times.push(at);
  } else {
    for (let at = start; at < end; at += interval) times.push(at);
  }
  for (const at of times.filter((t) => t > lastKept)) {
    // 세팅 칸은 게임 시작 때 올 딜러(예정 출근이 시작 시각 이전)를 모두 넣습니다.
    const checkAt = setup > 0 && at === first ? start : at;
    const available = options.dealers.filter((d) => availableAt(d, checkAt));
    const breaks = Math.max(0, available.length - tables);
    const cap = breaks > 0 ? Math.max(1, Math.round(tables / breaks)) : Number.POSITIVE_INFINITY;

    // 근무 우선순위: 0 이어서 일하기(cap 전) · 1 쉬던 사람(오래 쉰 순) · 2 cap 채운 사람(쉬어야 함)
    const ranked = [...available].sort((a, b) => {
      const sa = state.get(a.id)!;
      const sb = state.get(b.id)!;
      const pa = sa.lastTable != null ? (sa.streak < cap ? 0 : 2) : 1;
      const pb = sb.lastTable != null ? (sb.streak < cap ? 0 : 2) : 1;
      if (pa !== pb) return pa - pb;
      if (pa === 1 && sa.restStreak !== sb.restStreak) return sb.restStreak - sa.restStreak;
      if (sa.work !== sb.work) return sa.work - sb.work;
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
    const workers = ranked.slice(0, tables);
    const rest = ranked.slice(tables).map((d) => d.id);

    // 테이블: 이어서 일하는 딜러는 다음 테이블로, 들어오는 딜러는 빈 테이블로
    const seats: (string | null)[] = Array(tables).fill(null);
    const incoming: string[] = [];
    for (const dealer of workers) {
      const s = state.get(dealer.id)!;
      if (s.lastTable != null) {
        const next = (s.lastTable + 1) % tables;
        if (seats[next] == null) {
          seats[next] = dealer.id;
          continue;
        }
      }
      incoming.push(dealer.id);
    }
    for (let t = 0; t < tables && incoming.length; t += 1) {
      if (seats[t] == null) seats[t] = incoming.shift()!;
    }
    // 처음 들어오는 딜러들이 한꺼번에 같은 때 쉬지 않도록 쉬는 차례를 엇갈리게 둡니다.
    const fresh = Number.isFinite(cap) ? workers.filter((d) => state.get(d.id)!.work === 0).map((d) => d.id) : [];
    record({ at, seats, rest });
    fresh.forEach((id, index) => {
      state.get(id)!.streak += index % cap;
    });
  }

  return { start, end, interval, tables, slots, setup };
}

/** 지금(분) 기준 현재 칸·다음 칸 */
export function slotIndexAt(plan: RotationPlan, now: number) {
  let current = -1;
  plan.slots.forEach((slot, index) => {
    if (slot.at <= now) current = index;
  });
  return { current, next: current + 1 < plan.slots.length ? current + 1 : -1 };
}

/** 딜러 한 명의 일정: 칸마다 테이블 번호(1부터) 또는 휴식(0) 또는 없음(null) */
export function dealerSchedule(plan: RotationPlan, dealerId: string) {
  return plan.slots.map((slot) => {
    const table = slot.seats.indexOf(dealerId);
    if (table >= 0) return { at: slot.at, table: table + 1 };
    if (slot.rest.includes(dealerId)) return { at: slot.at, table: 0 };
    return { at: slot.at, table: null as number | null };
  });
}

/** 한 칸에서 다른 딜러로 바꾸기: 그 딜러가 다른 테이블에 있었으면 자리를 맞바꾸고, 쉬던 딜러면 원래 딜러가 휴식으로 */
export function swapInSlot(slot: PlanSlot, tableIndex: number, dealerId: string | null): PlanSlot {
  const seats = [...slot.seats];
  let rest = [...slot.rest];
  const current = seats[tableIndex];
  if (dealerId === current) return slot;
  const otherTable = dealerId ? seats.indexOf(dealerId) : -1;
  if (otherTable >= 0) {
    seats[otherTable] = current;
  } else {
    if (dealerId) rest = rest.filter((id) => id !== dealerId);
    if (current) rest.push(current);
  }
  seats[tableIndex] = dealerId;
  return { ...slot, seats, rest };
}

/** 끝 없이 돌리기: 한 번에 미리 짜 두는 길이(분)와, 남은 칸이 이만큼 아래로 줄면 자동으로 이어 짭니다. */
export const PLAN_HORIZON = 720;
export const EXTEND_WHEN_LEFT = 8;
/** 저장할 때 남겨 두는 지난 칸 수(너무 길어지지 않게) */
export const KEEP_PAST_SLOTS = 60;

/**
 * 시간 바꾸기: index 칸을 at으로 바꾸고, 그 뒤 칸은 간격대로 다시 맞춥니다.
 * (예: 13:30 → 13:35로 바꾸면 뒤는 13:50, 14:05 …) 배정은 그대로 둡니다.
 */
export function retimeFrom(plan: RotationPlan, index: number, at: number, interval = plan.interval): RotationPlan {
  const slots = plan.slots.map((slot, j) => (j < index ? slot : { ...slot, at: at + (j - index) * interval }));
  return { ...plan, interval, slots };
}

/** 남은 칸이 적으면 그 흐름 그대로 뒤를 이어 짭니다(끝 시간 없음). 지난 칸은 KEEP_PAST_SLOTS개만 남깁니다. */
export function extendPlan(plan: RotationPlan, dealers: PlanDealer[], current: number, horizon = PLAN_HORIZON): RotationPlan {
  const last = plan.slots[plan.slots.length - 1];
  if (!last) return plan;
  const built = buildPlan({
    dealers,
    tables: plan.tables,
    start: plan.start,
    end: last.at + plan.interval + horizon,
    interval: plan.interval,
    setup: plan.setup,
    keep: plan.slots,
  });
  const trimFrom = Math.max(0, current - KEEP_PAST_SLOTS);
  return { ...built, slots: built.slots.slice(trimFrom) };
}
