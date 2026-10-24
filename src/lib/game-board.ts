/**
 * 게임 현황판(토너먼트 시계): 블라인드 구조 · 레벨 시계 · 플레이어 · 평균 스택 · 프라이즈 · 공지.
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

/** 프라이즈 글씨 색(화면에서 고름) */
export const PRIZE_COLORS = {
  gold: { label: "금색", hex: "#fcd34d" },
  silver: { label: "은색", hex: "#e5e7eb" },
  bronze: { label: "동색", hex: "#f0a868" },
  red: { label: "빨강", hex: "#f87171" },
  pink: { label: "분홍", hex: "#f9a8d4" },
  purple: { label: "보라", hex: "#c4b5fd" },
  sky: { label: "하늘", hex: "#7dd3fc" },
  green: { label: "초록", hex: "#86efac" },
  white: { label: "흰색", hex: "#ffffff" },
} as const;
export type PrizeColor = keyof typeof PRIZE_COLORS;
export type PrizeRow = { place: string; amount: string; color: PrizeColor };
/** 순위별 기본 색: 1위 금 · 2위 은 · 3위 동 · 나머지 흰색 */
export const defaultPrizeColor = (index: number): PrizeColor => (["gold", "silver", "bronze"] as const)[index] ?? "white";

export type GameBoardData = {
  name: string;
  /** 이름 아래 작은 글씨(예: POKA DAY-1) */
  subtitle: string;
  levels: BoardLevel[];
  startStack: number;
  /** 바인 수(처음 바이인) */
  entries: number;
  /** 플레이 중(라이브) — 직접 정리 */
  remaining: number;
  /** 리바인 수(바인과 따로) · 리바인 칩 */
  rebuys: number;
  rebuyStack: number;
  /** 얼리칩 받은 수 · 얼리칩 */
  earlies: number;
  earlyStack: number;
  /** 애드온 화면에 보이기 · 수 · 칩 */
  addonOn: boolean;
  addons: number;
  addonStack: number;
  /** 등록 마감: 이 레벨(휴식 빼고 센 번호)이 끝날 때까지 등록 가능. 0이면 표시 안 함 */
  regLevel: number;
  /** 프라이즈 위 문구(예: GTD 1,000만) · 순위별 줄 */
  prizeTitle: string;
  prizes: PrizeRow[];
  /** 아래 흐르는 공지 */
  notice: string;
  /** 오른쪽 위 QR: view = 손님 휴대폰으로 이 현황판 보기(보기 링크) · store = 매장 QR(카톡방 · 메뉴판) · off = 없음 */
  qrMode: BoardQrMode;
  storeQrUrl: string;
  /** 매장 QR 옆 글씨(예: 매장 카톡방) */
  storeQrLabel: string;
  /** 배경 사진(올린 이미지 주소 /api/images/…) · 글씨가 잘 보이게 어둡게 덮는 정도(0~90%) */
  bgUrl: string;
  bgDim: number;
  clock: BoardClock;
};

export type BoardQrMode = "view" | "store" | "off";
export const QR_MODES: { value: BoardQrMode; label: string }[] = [
  { value: "view", label: "휴대폰으로 현황판 보기(추천)" },
  { value: "store", label: "매장 QR(카톡방 · 메뉴판 · 인스타)" },
  { value: "off", label: "QR 안 보이기" },
];
/** 손님에게 도움 되는 흐르는 공지 예시 */
export const NOTICE_EXAMPLE = "📱 오른쪽 위 QR을 찍으면 휴대폰으로 블라인드 · 남은 시간을 볼 수 있어요";
export const BOARD_LIMITS = { storeQrUrl: 300, storeQrLabel: 20, levels: 60, name: 30, subtitle: 40, prizes: 30, prizeText: 24, prizeTitle: 30, notice: 200, players: 10_000, chips: 1_000_000_000, minutes: 240 } as const;

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
    earlies: 0,
    earlyStack: 5_000,
    addonOn: false,
    addons: 0,
    addonStack: 20_000,
    regLevel: 0,
    prizeTitle: "",
    prizes: [],
    notice: "",
    qrMode: "view",
    storeQrUrl: "",
    storeQrLabel: "",
    bgUrl: "",
    bgDim: 60,
    clock: { level: 0, elapsedMs: 0, runningSince: null },
  };
}

/** 새 현황판 시작 방법: 기본 구조 · 빈 상태(1레벨) · 지난 현황판 구조 가져오기 */
export type BoardTemplate = "basic" | "empty" | "copy" | "saved";

/** 계정 하나가 만들 수 있는 현황판 수 · 따로 저장하는 구조 수 */
export const MAX_BOARDS = 30;
export const MAX_PRESETS = 30;
/** 한도에 이만큼 가까워지면 정리 안내 */
export const BOARD_WARN_LEFT = 5;

/** 따로 저장한 현황판 구조(이름 · 레벨 수) */
export type BoardPreset = { id: string; name: string; levels: number };

/** 새 현황판 데이터. copy는 지난 현황판의 블라인드·칩·등록 마감·프라이즈·공지·배경만 가져오고 인원·시계는 0부터 */
export function newBoardData(template: BoardTemplate, name: string, source?: GameBoardData | null): GameBoardData {
  const base = defaultBoard();
  const title = name.trim() || base.name;
  if (template === "empty") {
    return { ...base, name: title, levels: [{ sb: 100, bb: 200, ante: 200, minutes: 20 }] };
  }
  if ((template === "copy" || template === "saved") && source) {
    return {
      ...base,
      name: title,
      subtitle: source.subtitle,
      levels: source.levels,
      startStack: source.startStack,
      rebuyStack: source.rebuyStack,
      earlyStack: source.earlyStack,
      addonOn: source.addonOn,
      addonStack: source.addonStack,
      regLevel: source.regLevel,
      prizeTitle: source.prizeTitle,
      prizes: source.prizes,
      notice: source.notice,
      qrMode: source.qrMode,
      storeQrUrl: source.storeQrUrl,
      storeQrLabel: source.storeQrLabel,
      bgUrl: source.bgUrl,
      bgDim: source.bgDim,
    };
  }
  return { ...base, name: title };
}

const int = (v: unknown, min: number, max: number, fallback = 0) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (v: unknown, max: number) => String(v ?? "").slice(0, max);

/** 프라이즈 줄 정리. 예전 글 상금("1위 300만" 줄마다)도 줄로 바꿔 줌 */
function normalizePrizes(rows: unknown, legacy: unknown): PrizeRow[] {
  if (Array.isArray(rows)) {
    return rows.slice(0, BOARD_LIMITS.prizes).map((x, i) => {
      const row = (x ?? {}) as Partial<PrizeRow>;
      const color = String(row.color) in PRIZE_COLORS ? (row.color as PrizeColor) : defaultPrizeColor(i);
      return { place: text(row.place, BOARD_LIMITS.prizeText), amount: text(row.amount, BOARD_LIMITS.prizeText), color };
    });
  }
  if (typeof legacy !== "string") return [];
  return legacy
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, BOARD_LIMITS.prizes)
    .map((line, i) => {
      const m = /^(\S+)\s+(.+)$/.exec(line);
      return { place: text(m ? m[1] : "", BOARD_LIMITS.prizeText), amount: text(m ? m[2] : line, BOARD_LIMITS.prizeText), color: defaultPrizeColor(i) };
    });
}

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
    rebuyStack: int(r.rebuyStack, 0, BOARD_LIMITS.chips, int(r.startStack, 0, BOARD_LIMITS.chips, d.startStack)),
    earlies: int(r.earlies, 0, BOARD_LIMITS.players),
    earlyStack: int(r.earlyStack, 0, BOARD_LIMITS.chips, d.earlyStack),
    addonOn: Boolean(r.addonOn),
    addons: int(r.addons, 0, BOARD_LIMITS.players),
    addonStack: int(r.addonStack, 0, BOARD_LIMITS.chips, d.addonStack),
    regLevel: int(r.regLevel, 0, BOARD_LIMITS.levels),
    prizeTitle: text(r.prizeTitle, BOARD_LIMITS.prizeTitle),
    prizes: normalizePrizes(r.prizes, (r as { prize?: unknown }).prize),
    notice: text(r.notice, BOARD_LIMITS.notice),
    qrMode: r.qrMode === "store" || r.qrMode === "off" ? r.qrMode : "view",
    storeQrUrl: typeof r.storeQrUrl === "string" && /^https?:\/\/\S+$/.test(r.storeQrUrl.trim()) ? r.storeQrUrl.trim().slice(0, BOARD_LIMITS.storeQrUrl) : "",
    storeQrLabel: text(r.storeQrLabel, BOARD_LIMITS.storeQrLabel),
    bgUrl: typeof r.bgUrl === "string" && /^\/api\/images\/[\w-]{1,64}$/.test(r.bgUrl) ? r.bgUrl : "",
    bgDim: int(r.bgDim, 0, 90, 60),
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
  /** 러닝 타임: 레벨 1부터 지금까지 흐른 시간(휴식 포함, ms) */
  runningMs: number;
  /** 등록 마감까지 남은 시간(ms). 마감 레벨을 안 정했으면 null */
  regCloseMs: number | null;
  /** 등록 마감 레벨이 이미 끝남 */
  regClosed: boolean;
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
  // 등록 마감: regLevel번째 레벨(휴식 빼고 센 번호)이 끝나는 시각까지
  const number = Math.max(1, levels.slice(0, i + 1).filter((l) => !l.isBreak).length);
  let regCloseMs: number | null = null;
  let regClosed = false;
  if (data.regLevel > 0) {
    // 마감 칸: regLevel번째 레벨(휴식 빼고 센 번호). 그 바로 뒤 휴식까지는 등록 가능(휴식이 끝날 때 마감)
    let endIdx = levels.length - 1;
    let n = 0;
    for (let j = 0; j < levels.length; j++) {
      if (!levels[j].isBreak && ++n === data.regLevel) {
        endIdx = j;
        while (endIdx + 1 < levels.length && levels[endIdx + 1].isBreak) endIdx++;
        break;
      }
    }
    if (finished || i > endIdx) regClosed = true;
    else regCloseMs = remainingMs + levels.slice(i + 1, endIdx + 1).reduce((sum, l) => sum + levelMs(l), 0);
  }
  return {
    index: i,
    level: levels[i],
    number,
    remainingMs,
    running: running && !finished,
    finished,
    next: levels[i + 1] ?? null,
    nextBreakMs,
    runningMs: levels.slice(0, i).reduce((sum, l) => sum + levelMs(l), 0) + (levelMs(levels[i]) - remainingMs),
    regCloseMs,
    regClosed,
  };
}

export type ClockOp = { op: "start" } | { op: "pause" } | { op: "next" } | { op: "prev" } | { op: "reset" } | { op: "add"; ms: number } | { op: "set"; ms: number } | { op: "jump"; index: number };

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
    case "set": {
      // 남은 시간을 직접 정함(1초 ~ 레벨 3배)
      const dur = levelMs(view.level);
      const remain = Math.min(dur * 3, Math.max(1_000, Math.round(op.ms)));
      return at(view.index, dur - remain, running);
    }
    case "add": {
      // 남은 시간 더하기/빼기(이번 레벨 안에서만: 남은 시간은 1초~레벨 3배)
      const dur = levelMs(view.level);
      const elapsed = Math.min(dur - 1_000, Math.max(-dur * 2, offset - Math.round(op.ms)));
      return at(view.index, elapsed, running);
    }
  }
}

/** 총 칩(바인 × 시작 스택 + 리바인 × 리바인 칩 + 얼리 × 얼리칩 + 애드온 × 애드온 칩) · 평균 스택(플레이 중 기준) */
export function boardStats(data: GameBoardData) {
  const totalChips = data.entries * data.startStack + data.rebuys * data.rebuyStack + data.earlies * data.earlyStack + (data.addonOn ? data.addons * data.addonStack : 0);
  const avgStack = data.remaining > 0 ? Math.round(totalChips / data.remaining) : 0;
  return { totalChips, avgStack };
}

/** 시간 글 읽기: "12:30" · "1:02:00" · "15"(분) → ms. 못 읽으면 null */
export function parseClockInput(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d{1,3}$/.test(t)) return Number(t) * 60_000;
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{1,2})$/.exec(t);
  if (!m || Number(m[3]) > 59) return null;
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000;
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
