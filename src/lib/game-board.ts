/**
 * 게임 현황판(토너먼트 시계): 블라인드 구조 · 레벨 시계 · 인원 · 평균 스택 · 상금 · 공지.
 * 계정마다 따로 저장(비공개)하고, 주인이 켜면 로그인 없이 보는 TV 링크(/g/값)를 줍니다.
 * 시계는 서버 시각 기준(runningSince)이라 조작하는 휴대폰과 TV가 같은 시간을 보여 줍니다.
 */

export type BoardLevel = { sb: number; bb: number; ante: number; minutes: number; isBreak?: boolean };

export type BoardClock = {
  /** 기준 레벨(멈추거나 레벨을 옮길 때마다 여기로 정리) */
  level: number;
  /** 기준 레벨 시작부터 흐른 시간(ms, 멈춘 동안 쌓인 것) */
  elapsedMs: number;
  /** 돌고 있으면 다시 돌기 시작한 서버 시각(ms), 멈췄으면 null */
  runningSince: number | null;
};

export type GameBoardData = {
  name: string;
  /** 이름 아래 작은 글씨(예: POKA DAY-1) */
  subtitle: string;
  levels: BoardLevel[];
  startStack: number;
  entries: number;
  remaining: number;
  rebuys: number;
  rebuyStack: number;
  addons: number;
  addonStack: number;
  /** 상금(한 줄에 하나: "1위 300만") */
  prize: string;
  /** 아래 흐르는 공지 */
  notice: string;
  clock: BoardClock;
};

export const BOARD_LIMITS = { levels: 60, name: 30, subtitle: 40, prize: 600, notice: 200, players: 10_000, chips: 1_000_000_000, minutes: 240 } as const;

/** 블라인드 구조 만들기(BB 앤티 = BB): 시작 BB부터 레벨마다 올리고, every 레벨마다 휴식 */
export function makeStructure({ startBb = 200, minutes = 20, count = 16, breakEvery = 4, breakMinutes = 10 } = {}): BoardLevel[] {
  // 흔히 쓰는 BB 배수(시작 BB 기준)
  const STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500];
  const out: BoardLevel[] = [];
  for (let i = 0; i < count; i++) {
    const bb = Math.round((startBb * STEPS[Math.min(i, STEPS.length - 1)]) / 100) * 100 || 100;
    out.push({ sb: Math.max(100, Math.round(bb / 2 / 100) * 100), bb, ante: bb, minutes });
    if (breakEvery > 0 && (i + 1) % breakEvery === 0 && i + 1 < count) out.push({ sb: 0, bb: 0, ante: 0, minutes: breakMinutes, isBreak: true });
  }
  return out;
}

export function defaultBoard(): GameBoardData {
  return {
    name: "메인 토너먼트",
    subtitle: "",
    levels: makeStructure(),
    startStack: 30_000,
    entries: 0,
    remaining: 0,
    rebuys: 0,
    rebuyStack: 30_000,
    addons: 0,
    addonStack: 0,
    prize: "",
    notice: "",
    clock: { level: 0, elapsedMs: 0, runningSince: null },
  };
}

const int = (v: unknown, min: number, max: number, fallback = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (v: unknown, max: number) => String(v ?? "").slice(0, max);

/** 밖에서 받은 값 정리(이상한 값은 고치거나 버림) */
export function normalizeBoard(raw: unknown): GameBoardData {
  const d = defaultBoard();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<Record<keyof GameBoardData, unknown>>;
  const levels = Array.isArray(r.levels)
    ? r.levels.slice(0, BOARD_LIMITS.levels).map((x) => {
        const l = (x ?? {}) as Partial<BoardLevel>;
        const isBreak = Boolean(l.isBreak);
        return {
          sb: isBreak ? 0 : int(l.sb, 0, BOARD_LIMITS.chips),
          bb: isBreak ? 0 : int(l.bb, 0, BOARD_LIMITS.chips),
          ante: isBreak ? 0 : int(l.ante, 0, BOARD_LIMITS.chips),
          minutes: int(l.minutes, 1, BOARD_LIMITS.minutes, 20),
          ...(isBreak ? { isBreak: true } : {}),
        };
      })
    : d.levels;
  const c = (r.clock ?? {}) as Partial<BoardClock>;
  return {
    name: text(r.name ?? d.name, BOARD_LIMITS.name) || d.name,
    subtitle: text(r.subtitle, BOARD_LIMITS.subtitle),
    levels: levels.length ? levels : d.levels,
    startStack: int(r.startStack, 0, BOARD_LIMITS.chips, d.startStack),
    entries: int(r.entries, 0, BOARD_LIMITS.players),
    remaining: int(r.remaining, 0, BOARD_LIMITS.players),
    rebuys: int(r.rebuys, 0, BOARD_LIMITS.players),
    rebuyStack: int(r.rebuyStack, 0, BOARD_LIMITS.chips, d.rebuyStack),
    addons: int(r.addons, 0, BOARD_LIMITS.players),
    addonStack: int(r.addonStack, 0, BOARD_LIMITS.chips),
    prize: text(r.prize, BOARD_LIMITS.prize),
    notice: text(r.notice, BOARD_LIMITS.notice),
    clock: {
      level: int(c.level, 0, Math.max(0, levels.length - 1)),
      elapsedMs: int(c.elapsedMs, -BOARD_LIMITS.minutes * 60_000, BOARD_LIMITS.minutes * 60_000 * BOARD_LIMITS.levels),
      runningSince: c.runningSince != null && Number.isFinite(Number(c.runningSince)) && Number(c.runningSince) > 0 ? Math.floor(Number(c.runningSince)) : null,
    },
  };
}

export const levelMs = (l: BoardLevel) => l.minutes * 60_000;

export type ClockView = {
  /** 지금 레벨 칸 번호(levels 안) */
  index: number;
  level: BoardLevel;
  /** 휴식 칸을 빼고 센 레벨 번호(1부터). 휴식이면 직전 레벨 번호 */
  number: number;
  remainingMs: number;
  running: boolean;
  /** 마지막 레벨 시간까지 다 지남 */
  finished: boolean;
  next: BoardLevel | null;
  /** 다음 휴식까지 남은 시간(ms). 지금이 휴식이거나 휴식이 없으면 null */
  nextBreakMs: number | null;
};

/** 시계 보기: 기준 레벨부터 흐른 시간만큼 레벨을 넘기며 지금 레벨 · 남은 시간 계산 */
export function clockView(data: GameBoardData, now: number): ClockView {
  const { levels, clock } = data;
  const running = clock.runningSince != null;
  let t = clock.elapsedMs + (running ? Math.max(0, now - (clock.runningSince as number)) : 0);
  let i = Math.min(clock.level, levels.length - 1);
  while (i < levels.length - 1 && t >= levelMs(levels[i])) {
    t -= levelMs(levels[i]);
    i++;
  }
  const finished = i === levels.length - 1 && t >= levelMs(levels[i]);
  const remainingMs = finished ? 0 : levelMs(levels[i]) - t;
  let nextBreakMs: number | null = null;
  if (!levels[i].isBreak) {
    let acc = remainingMs;
    for (let j = i + 1; j < levels.length; j++) {
      if (levels[j].isBreak) {
        nextBreakMs = acc;
        break;
      }
      acc += levelMs(levels[j]);
    }
  }
  return {
    index: i,
    level: levels[i],
    number: Math.max(1, levels.slice(0, i + 1).filter((l) => !l.isBreak).length),
    remainingMs,
    running: running && !finished,
    finished,
    next: levels[i + 1] ?? null,
    nextBreakMs,
  };
}

export type ClockOp = { op: "start" } | { op: "pause" } | { op: "next" } | { op: "prev" } | { op: "reset" } | { op: "add"; ms: number } | { op: "jump"; index: number };

/** 시계 조작(서버 시각 now 기준). 지금 상태로 정리한 뒤 바꿉니다. */
export function applyClock(data: GameBoardData, op: ClockOp, now: number): BoardClock {
  const view = clockView(data, now);
  const running = data.clock.runningSince != null && !view.finished;
  const offset = levelMs(view.level) - view.remainingMs;
  const at = (level: number, elapsedMs: number, run: boolean): BoardClock => ({ level, elapsedMs, runningSince: run ? now : null });
  const last = data.levels.length - 1;
  switch (op.op) {
    case "start":
      return view.finished ? at(view.index, offset, false) : at(view.index, offset, true);
    case "pause":
      return at(view.index, offset, false);
    case "next":
      return at(Math.min(last, view.index + 1), 0, running);
    case "prev":
      // 레벨 시작 10초가 넘었으면 이번 레벨 처음으로, 아니면 이전 레벨로
      return offset > 10_000 ? at(view.index, 0, running) : at(Math.max(0, view.index - 1), 0, running);
    case "reset":
      return at(0, 0, false);
    case "jump":
      return at(Math.min(last, Math.max(0, Math.floor(op.index))), 0, running);
    case "add": {
      // 남은 시간 더하기/빼기(이번 레벨 안에서만: 남은 시간은 1초~레벨 3배)
      const dur = levelMs(view.level);
      const elapsed = Math.min(dur - 1_000, Math.max(-dur * 2, offset - Math.round(op.ms)));
      return at(view.index, elapsed, running);
    }
  }
}

/** 총 칩 · 평균 스택(남은 인원 기준) */
export function boardStats(data: GameBoardData) {
  const totalChips = data.entries * data.startStack + data.rebuys * data.rebuyStack + data.addons * data.addonStack;
  const avgStack = data.remaining > 0 ? Math.round(totalChips / data.remaining) : 0;
  return { totalChips, avgStack };
}

/** 상금 줄 나누기: "1위 300만" → ["1위", "300만"] */
export function prizeLines(prize: string) {
  return prize
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((line) => {
      const m = /^(\S+)\s+(.+)$/.exec(line);
      return m ? { place: m[1], amount: m[2] } : { place: "", amount: line };
    });
}

/** 남은 시간 "12:05" / 한 시간 넘으면 "1:02:05" */
export function clockText(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/** 칩 금액 짧게: 1,500 / 12.5K / 1.2M */
export function chipText(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 100_000) return `${+(n / 1000).toFixed(0)}K`;
  return Math.round(n).toLocaleString("ko-KR");
}
