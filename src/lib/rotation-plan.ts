/**
 * 딜러 로테이션 시간표 짜기(DB 없이 계산만).
 *
 * 시간은 "그날 0시부터 몇 분"(분 단위 정수)으로 다룹니다. 밤샘 대회처럼 시작보다 이른 시각은 다음 날(+1440)로 봅니다.
 *
 * 한 칸(예: 20분)마다
 * 1) 그 시각에 일할 수 있는 딜러(출근 이후 · 퇴근 전 · 휴무 아님)를 고르고
 * 2) 테이블 수만큼 근무, 나머지는 휴식. 계속 일하던 딜러는 정해진 횟수(cap)까지 이어서 일하고, 오래 쉰 딜러부터 들어옵니다.
 *    cap = 테이블 수 ÷ 휴식 인원(반올림) → 모두가 cap칸 일하고 1칸 쉬는 흐름이 고르게 돕니다.
 * 3) 앉아 있던 딜러는 교대를 받을 때까지 그 테이블 그대로, 비는 테이블(휴식 가는 딜러 자리)은 들어오는 딜러가 채웁니다.
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
  /** 최대 연속 딜 칸 수(0·없음 = 제한 없음). 이어 짤 때도 같은 규칙을 씁니다. */
  maxStreak?: number;
  /** 직접 배치: 컨바인 · 이어 짜기 때 자동으로 다시 짜지 않고 빈칸으로 둠(배치는 사람이) */
  manual?: boolean;
};

/**
 * 최대 연속 딜 칸 수(K)를 지키려면 필요한 딜러 수: K칸 딜 + 1칸 휴식이 돌려면
 * 러닝 테이블 × (K+1) ÷ K 명(올림). K가 0이면 제한 없음(테이블 수만큼).
 */
export function dealersNeeded(openTables: number, maxStreak: number) {
  if (openTables <= 0) return 0;
  if (!maxStreak || maxStreak <= 0) return openTables;
  return Math.ceil((openTables * (maxStreak + 1)) / maxStreak);
}

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

type DealerState = {
  lastTable: number | null;
  streak: number;
  restStreak: number;
  work: number;
  /** 공평한 몫: 있었던 칸마다 (딜 자리 ÷ 그 칸 딜러 수)를 더한 값. 몫 − 딜한 칸 = 덜 딜한 만큼 */
  share: number;
  /** 테이블별 들어간 횟수(휴식 뒤 새로 앉은 번) */
  visits: Map<number, number>;
  /** 테이블별 마지막으로 앉은 칸 번호 */
  seenAt: Map<number, number>;
};

/**
 * 휴식에서 돌아온 · 새로 출근한 딜러를 빈 테이블에 앉힘(모두 합쳐 가장 고르게 되는 짝으로).
 * 짝마다 비용 = 그 테이블에 들어간 횟수(가장 큼) + 최근에 들어갔던 테이블일수록 조금 더 → 같은 테이블이 연달아 걸리지 않게.
 * 못 넣는 테이블은 제외, 자리가 모자라면 뒤 순서(나중에 들어갈 사람)가 남음. 남은 사람은 돌려줌.
 */
function seatIncoming(
  incoming: string[],
  emptyTables: number[],
  visitsOf: (id: string, t: number) => number,
  blockedAt: (t: number, id: string) => boolean,
  /** 그 테이블에 마지막으로 앉은 뒤 지난 칸 수(없으면 null) */
  agoOf: (id: string, t: number) => number | null = () => null,
) {
  const BLOCK = 1e9;
  const SKIP = 1e7;
  const n = incoming.length;
  const cols = emptyTables.length + n; // 뒤쪽 n칸 = 「못 앉음」
  const cost = incoming.map((id, i) =>
    Array.from({ length: cols }, (_, c) => {
      if (c >= emptyTables.length) return SKIP * (n - i); // 앞 순서일수록 못 앉으면 손해가 큼
      const t = emptyTables[c];
      if (blockedAt(t, id)) return BLOCK;
      const ago = agoOf(id, t);
      return visitsOf(id, t) * 1000 + (ago == null ? 0 : Math.max(0, 100 - ago)) + c * 0.001;
    }),
  );
  const pick = assign(cost);
  const placed: [number, string][] = [];
  const left: string[] = [];
  incoming.forEach((id, i) => {
    const c = pick[i];
    if (c < emptyTables.length && cost[i][c] < BLOCK) placed.push([emptyTables[c], id]);
    else left.push(id);
  });
  return { placed, left };
}

/** 최소 비용 짝 맞추기(헝가리안, 행 ≤ 열). 행마다 고른 열 */
function assign(cost: number[][]) {
  const n = cost.length;
  if (!n) return [] as number[];
  const m = cost[0].length;
  const u = Array(n + 1).fill(0);
  const v = Array(m + 1).fill(0);
  const p = Array(m + 1).fill(0);
  const way = Array(m + 1).fill(0);
  for (let i = 1; i <= n; i += 1) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(m + 1).fill(Number.POSITIVE_INFINITY);
    const used = Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;
      for (let j = 1; j <= m; j += 1) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j += 1) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const out = Array(n).fill(-1);
  for (let j = 1; j <= m; j += 1) if (p[j]) out[p[j] - 1] = j - 1;
  return out;
}

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
  /** 테이블별 컨바인(닫은) 시각(분). 이 시각부터 그 테이블은 비워 둡니다. null이면 러닝 중 */
  closedFrom?: (number | null)[];
  /** 최대 연속 딜 칸 수(0 = 제한 없음). 사람이 모자라면 지킬 수 없어 화면에서 경고합니다. */
  maxStreak?: number;
  /** 테이블별(인덱스) 못 넣는 딜러 id */
  blocked?: string[][];
}): RotationPlan {
  const maxStreak = Math.max(0, Math.floor(options.maxStreak ?? 0));
  const blockedAt = (t: number, id: string) => Boolean(options.blocked?.[t]?.includes(id));
  const tables = Math.max(1, Math.floor(options.tables));
  const interval = Math.max(5, Math.floor(options.interval));
  const start = options.start;
  const end = options.end > start ? options.end : options.end + MINUTES_PER_DAY;
  const order = new Map(options.dealers.map((d, i) => [d.id, i]));
  const state = new Map<string, DealerState>(
    options.dealers.map((d) => [d.id, { lastTable: null, streak: 0, restStreak: Number.POSITIVE_INFINITY, work: 0, share: 0, visits: new Map<number, number>(), seenAt: new Map<number, number>() }]),
  );

  const slots: PlanSlot[] = [];
  const record = (slot: PlanSlot) => {
    const working = new Set<string>();
    // 이 칸에 있던 딜러(딜 + 휴식)는 모두 같은 몫을 받음
    const seatedCount = slot.seats.filter(Boolean).length;
    const present = [...slot.seats, ...slot.rest].filter((id): id is string => Boolean(id));
    for (const id of present) {
      const s = state.get(id);
      if (s) s.share += seatedCount / present.length;
    }
    slot.seats.forEach((id, table) => {
      if (!id) return;
      working.add(id);
      const s = state.get(id);
      if (!s) return;
      if (s.lastTable !== table) s.visits.set(table, (s.visits.get(table) ?? 0) + 1);
      s.seenAt.set(table, slots.length);
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

  const closedFrom = options.closedFrom ?? [];
  const isOpen = (t: number, at: number) => closedFrom[t] == null || at < (closedFrom[t] as number);
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
    // 러닝 중인 테이블(컨바인한 테이블 제외)
    const open = [...Array(tables).keys()].filter((t) => isOpen(t, at));
    const breaks = Math.max(0, available.length - open.length);
    const fairCap = breaks > 0 ? Math.max(1, Math.round(open.length / breaks)) : Number.POSITIVE_INFINITY;
    // 최대 연속 딜을 정했으면 그보다 길게 잇지 않습니다(쉴 사람이 있을 때).
    const cap = maxStreak > 0 ? Math.min(fairCap, maxStreak) : fairCap;

    // 근무 우선순위: -1 방금 출근(아직 한 번도 안 딜함 → 출근한 칸부터 바로 딜)
    // · 0 쉬던 사람(오래 쉰 순 — 휴게는 한 칸(교대 간격)만 쉬고 바로 돌아옴) · 1 이어서 일하기(cap 전 · 짧게 이어 딜한 사람부터)
    // · 2 cap 채운 사람(쉬어야 함). 자리가 모자라면 오래 이어서 딜한 사람이 쉼.
    // (예전엔 이어서 일하는 사람이 쉬던 사람보다 앞이라, 30분 교대인데 휴게가 1시간씩 잡혔음)
    const tier = (st: DealerState) => (st.work === 0 && st.lastTable == null ? -1 : st.lastTable == null ? 0 : st.streak < cap ? 1 : 2);
    const ranked = [...available].sort((a, b) => {
      const sa = state.get(a.id)!;
      const sb = state.get(b.id)!;
      const pa = tier(sa);
      const pb = tier(sb);
      if (pa !== pb) return pa - pb;
      // 쉬던 사람은 오래 쉰 사람부터(휴게가 길어지지 않게)
      if (pa === 0 && sa.restStreak !== sb.restStreak) return sb.restStreak - sa.restStreak;
      // 같은 차례 안에서는 지금까지 몫보다 덜 딜한 사람부터(반 칸 넘게 차이 날 때) — 오늘 전체 딜 시간을 고르게
      const owe = sa.share - sa.work - (sb.share - sb.work);
      if (pa >= 0 && Math.abs(owe) > 0.5) return owe > 0 ? -1 : 1;
      if (pa === 1 && sa.streak !== sb.streak) return sa.streak - sb.streak;
      if (sa.work !== sb.work) return sa.work - sb.work;
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
    const workers = ranked.slice(0, open.length);
    const rest = ranked.slice(open.length).map((d) => d.id);

    // 테이블: 앉아 있던 딜러는 교대(휴식)를 받을 때까지 그 테이블에 그대로 — 교대 없이 다른 테이블로 옮기는 일은 없음.
    // 들어오는 딜러(휴식에서 돌아옴 · 새로 출근)는 빈 테이블로 가서 그 테이블 딜러를 휴식 보냄.
    // 자기 테이블이 컨바인됐을 때만 빈 테이블로 옮김.
    const seats: (string | null)[] = Array(tables).fill(null);
    const incoming: string[] = [];
    for (const dealer of workers) {
      const s = state.get(dealer.id)!;
      const own = s.lastTable;
      if (own != null && open.includes(own) && seats[own] == null && !blockedAt(own, dealer.id)) {
        seats[own] = dealer.id;
        continue;
      }
      incoming.push(dealer.id);
    }
    // 들어오는 딜러: 각자 가장 적게 들어간 테이블로(같은 테이블만 계속 들어가지 않게) · 못 넣는 테이블은 건너뜀
    const seated = seatIncoming(
      incoming,
      open.filter((t) => seats[t] == null),
      (id, t) => state.get(id)?.visits.get(t) ?? 0,
      blockedAt,
      (id, t) => {
        const last = state.get(id)?.seenAt.get(t);
        return last == null ? null : slots.length - last;
      },
    );
    for (const [t, id] of seated.placed) seats[t] = id;
    // 막힌 테이블 때문에 못 앉은 딜러는 휴식으로
    for (const id of seated.left) if (!rest.includes(id)) rest.push(id);
    // 처음 들어오는 딜러들이 한꺼번에 같은 때 쉬지 않도록 쉬는 차례를 엇갈리게 둡니다.
    const fresh = Number.isFinite(cap) ? workers.filter((d) => state.get(d.id)!.work === 0).map((d) => d.id) : [];
    record({ at, seats, rest });
    fresh.forEach((id, index) => {
      state.get(id)!.streak += index % cap;
    });
  }

  return { start, end, interval, tables, slots, setup, ...(maxStreak ? { maxStreak } : {}) };
}

/**
 * 테이블 번호가 바뀌었을 때 시간표 옮겨 담기(게임 중 테이블 추가 오픈 등).
 * - 겹치는 번호가 있으면: 번호 기준으로 그대로 옮기고, 새 테이블은 빈칸, 빠진 테이블의 딜러는 휴식으로.
 * - 겹치는 번호가 없고 개수가 같으면: 번호만 바꾼 것으로 보고 순서대로 그대로.
 * - 그 밖에는 옮길 수 없어 null(다시 짜야 함).
 */
export function remapPlanTables(plan: RotationPlan, oldLabels: number[], newLabels: number[]): RotationPlan | null {
  const overlap = newLabels.some((label) => oldLabels.includes(label));
  if (!overlap) return oldLabels.length === newLabels.length ? { ...plan, tables: newLabels.length } : null;
  const slots = plan.slots.map((slot) => {
    const seats = newLabels.map((label) => {
      const old = oldLabels.indexOf(label);
      return old >= 0 ? (slot.seats[old] ?? null) : null;
    });
    const dropped = oldLabels
      .map((label, i) => (newLabels.includes(label) ? null : slot.seats[i]))
      .filter((id): id is string => Boolean(id) && !slot.rest.includes(id as string));
    return { ...slot, seats, rest: [...slot.rest, ...dropped] };
  });
  return { ...plan, tables: newLabels.length, slots };
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
export function extendPlan(
  plan: RotationPlan,
  dealers: PlanDealer[],
  current: number,
  horizon = PLAN_HORIZON,
  closedFrom?: (number | null)[],
  blocked?: string[][],
): RotationPlan {
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
    closedFrom,
    maxStreak: plan.maxStreak,
    blocked,
  });
  const trimFrom = Math.max(0, current - KEEP_PAST_SLOTS);
  return { ...built, slots: built.slots.slice(trimFrom) };
}

/**
 * Auto: 지금 칸과 그 뒤를 자동으로 정리합니다.
 * - 지금 칸: 맞는 배정은 그대로 두고, 퇴근·휴무 딜러와 컨바인 테이블 자리만 비운 뒤
 *   지금까지 딜한 칸이 적은 딜러(같으면 지금 쉬고 있던 딜러)부터 빈 러닝 테이블을 채웁니다.
 * - 다음 칸부터: 지난 칸 기록(딜·휴식 흐름)을 이어 공평하게 다시 짭니다.
 * current < 0(게임 시작 전)이면 처음부터 짭니다.
 */
export function autoArrange(options: {
  plan: RotationPlan | null;
  dealers: PlanDealer[];
  current: number;
  tables: number;
  start: number;
  interval: number;
  setup?: number;
  now: number;
  closedFrom?: (number | null)[];
  horizon?: number;
  maxStreak?: number;
  blocked?: string[][];
}): RotationPlan {
  const horizon = options.horizon ?? PLAN_HORIZON;
  const blockedAt = (t: number, id: string) => Boolean(options.blocked?.[t]?.includes(id));
  const closedFrom = options.closedFrom ?? [];
  const end = Math.max(options.now, options.start) + horizon;
  const base = {
    dealers: options.dealers,
    tables: options.tables,
    start: options.start,
    end,
    interval: options.interval,
    setup: options.setup,
    closedFrom,
    maxStreak: options.maxStreak,
    blocked: options.blocked,
  };
  const plan = options.plan;
  if (!plan || options.current < 0 || !plan.slots[options.current]) return buildPlan(base);

  const before = plan.slots.slice(0, options.current);
  const cur = plan.slots[options.current];
  const at = cur.at;
  // 지금 칸: Auto를 누른 시각까지 출근했고, 이 칸이 끝나기 전에 퇴근하지 않는 딜러만(칸 중간 퇴근은 바로 교체)
  const moment = Math.max(at, options.now);
  const slotEnd = Math.max(at + options.interval, moment);
  const available = new Set(options.dealers.filter((d) => d.from <= moment && (d.to == null || d.to >= slotEnd)).map((d) => d.id));
  const isOpen = (t: number) => closedFrom[t] == null || at < (closedFrom[t] as number);

  // 지금까지 딜한 칸 수(공평하게 채우기)
  const work = new Map<string, number>();
  for (const slot of before) for (const id of slot.seats) if (id) work.set(id, (work.get(id) ?? 0) + 1);

  const seats: (string | null)[] = Array.from({ length: options.tables }, (_, t) => {
    const id = cur.seats[t] ?? null;
    if (!isOpen(t)) return null;
    return id && available.has(id) && !blockedAt(t, id) ? id : null;
  });
  const seated = new Set(seats.filter(Boolean) as string[]);
  const order = new Map(options.dealers.map((d, i) => [d.id, i]));
  // 지금까지 이어서 쉰 칸 수: 가장 오래 쉰 딜러가 먼저 나옵니다(휴게 시간 맞추기). 지금 시간표에 없던 딜러(새로 출근)는 다 쉰 것으로 봅니다.
  const prev = before[before.length - 1];
  const restRun = (id: string) => {
    // 바로 앞 칸에 딜하던 딜러(이 칸에 막 교대로 나옴)는 아직 못 쉼 → 맨 뒤(또 다른 테이블로 바로 보내지 않게)
    if (prev?.seats.includes(id)) return 0;
    if (!cur.rest.includes(id)) return Number.POSITIVE_INFINITY;
    let run = 1;
    for (let i = before.length - 1; i >= 0 && before[i].rest.includes(id); i -= 1) run += 1;
    return run;
  };
  const candidates = [...available]
    .filter((id) => !seated.has(id))
    .sort((a, b) => {
      const ra = restRun(a);
      const rb = restRun(b);
      if (ra !== rb) return rb - ra;
      const wa = work.get(a) ?? 0;
      const wb = work.get(b) ?? 0;
      if (wa !== wb) return wa - wb;
      return (order.get(a) ?? 0) - (order.get(b) ?? 0);
    });
  // 지금 칸 빈자리: 지난 칸 기록으로 각자 가장 적게 들어간 테이블에(못 넣는 테이블 제외)
  const visits = new Map<string, Map<number, number>>();
  const seenAt = new Map<string, Map<number, number>>();
  for (let i = 0; i < before.length; i += 1) {
    before[i].seats.forEach((id, t) => {
      if (!id) return;
      const last = seenAt.get(id) ?? new Map<number, number>();
      last.set(t, i);
      seenAt.set(id, last);
      if (before[i - 1]?.seats[t] === id) return;
      const m = visits.get(id) ?? new Map<number, number>();
      m.set(t, (m.get(t) ?? 0) + 1);
      visits.set(id, m);
    });
  }
  const empty = [...Array(options.tables).keys()].filter((t) => seats[t] == null && isOpen(t));
  // 먼저 들어갈 사람(오래 쉰 순) 빈자리 수만큼 · 그 안에서 테이블은 고르게
  const want = candidates.slice(0, empty.length);
  const fill = seatIncoming(want, empty, (id, t) => visits.get(id)?.get(t) ?? 0, blockedAt, (id, t) => {
    const last = seenAt.get(id)?.get(t);
    return last == null ? null : before.length - last;
  });
  for (const [t, id] of fill.placed) {
    seats[t] = id;
    seated.add(id);
  }
  // 교대 시각 바로 뒤(5분 안 · 아직 자리를 바꾸기 전)에 누르면: 앞 칸 T(p)에서 딜하던 딜러가 지금 칸 다른 테이블로 가 있으면
  // 원래 테이블로 돌려놓고, 그 자리에 들어오던 딜러(쉬다 들어옴)를 다른 테이블로 — 교대 없이 테이블을 옮기는 딜러가 없게
  if (prev && options.now - at < Math.min(5, options.interval / 4)) {
    for (let round = 0; round < options.tables; round += 1) {
      let changed = false;
      seats.forEach((id, t) => {
        if (!id) return;
        const p = prev.seats.indexOf(id);
        if (p < 0 || p === t || p >= options.tables || !isOpen(p) || blockedAt(p, id)) return;
        const other = seats[p];
        if (other && (prev.seats.includes(other) || blockedAt(t, other))) return;
        seats[p] = id;
        seats[t] = other ?? null;
        changed = true;
      });
      if (!changed) break;
    }
  }
  const rest = [...available].filter((id) => !seated.has(id));
  return buildPlan({ ...base, keep: [...before, { at, seats, rest }] });
}
