/**
 * 딜러 로테이션 공용 규칙(서버·화면 공통, DB 없이 계산만).
 * 딜러 상태: WAIT 출근 전 · IN 출근 · OFF 휴무 · LEFT 퇴근
 * 근무·휴식은 시간표(rotation-plan)로 정합니다.
 */
import { alignToStart, parseClock, type PlanDealer, type RotationPlan } from "@/lib/rotation-plan";

export const MAX_TABLES = 100;
/** 계정마다 만들 수 있는 게임 수 */
export const MAX_GAMES = 100;
export const MAX_DEALERS = 150;
export const INTERVAL_CHOICES = [10, 15, 20, 25, 30, 40, 45, 60] as const;
/** 간격 직접 입력 범위(분) */
export const INTERVAL_MIN = 5;
export const INTERVAL_MAX = 120;

export const DEALER_STATUSES = ["WAIT", "IN", "OFF", "LEFT"] as const;
export type DealerStatus = (typeof DEALER_STATUSES)[number];

export const STATUS_LABEL: Record<DealerStatus, string> = {
  WAIT: "출근 전",
  IN: "출근",
  OFF: "휴무",
  LEFT: "퇴근",
};

export type TableState = {
  button?: number | null;
  /** 컨바인(닫은) 시각(분) */
  closedAt?: number | null;
  /** 게임 중 추가로 연 시각(분). 이보다 앞 칸은 "오픈 전" */
  openedAt?: number | null;
};

/** 시간표 테이블 순서대로 추가 오픈 시각(없으면 null) */
export function openedFromOf(labels: number[], tableState: Record<string, TableState>) {
  return labels.map((label) => tableState[String(label)]?.openedAt ?? null);
}

/** 시간표 테이블 순서대로 컨바인 시각(없으면 null) */
export function closedFromOf(labels: number[], tableState: Record<string, TableState>) {
  return labels.map((label) => tableState[String(label)]?.closedAt ?? null);
}

export type RotationDealerView = {
  id: string;
  name: string;
  /** 예정 출근 시각 "18:00" */
  startTime: string | null;
  /** 예정 퇴근 시각 "02:00" */
  endTime: string | null;
  status: DealerStatus;
  /** 실제 출근 체크 시각(ISO) */
  checkedInAt: string | null;
  leftAt: string | null;
  sort: number;
};

/** 게임(근무일·이벤트) 목록 한 줄 */
export type RotationGame = { id: string; name: string; workDate: string | null };

export type RotationStateView = {
  /** 지금 보고 있는 게임 */
  game: RotationGame;
  /** 보기 전용 공유 링크 값(없으면 공유 꺼짐) */
  shareToken: string | null;
  /** 최대 연속 딜(분). 0이면 제한 없음 */
  maxStreakMinutes: number;
  /** 공유 링크 열림 기간(1 · 3 · 0=계속) */
  shareDays: number;
  /** 새 게임을 만들 때 쓸 열림 기간(계정 설정) */
  defaultShareDays: number;
  /** 이 계정의 게임(날짜 최신순, 최대 MAX_GAMES개) */
  games: RotationGame[];
  version: number;
  tableCount: number;
  /** 테이블 번호(T5 등). 길이 = tableCount */
  tableLabels: number[];
  /** 게임 시작 전 세팅 칸(분) */
  setupMinutes: number;
  /** 테이블 번호별 버튼 자리·컨바인 시각(분, 시간표 기준) */
  tableState: Record<string, TableState>;
  interval: number;
  planStart: string;
  planEnd: string;
  dealers: RotationDealerView[];
  plan: RotationPlan | null;
  /** 따로 저장한 딜러 명단 */
  rosters: RotationRoster[];
  /** 휴지통(지운 게임, 최근 것부터) */
  trash: RotationTrash[];
};

export type RotationAction =
  | { type: "addDealers"; dealers: { name: string; startTime?: string | null; endTime?: string | null }[] }
  | { type: "setTimes"; id: string; start?: string | null; end?: string | null }
  | { type: "updateDealer"; id: string; name?: string; startTime?: string | null }
  | { type: "removeDealer"; id: string }
  | { type: "checkIn"; id: string }
  | { type: "setStatus"; id: string; status: "WAIT" | "OFF" | "LEFT" }
  | {
      type: "setSettings";
      tableLabels?: string;
      /** 테이블을 추가로 열 때, 새 테이블이 열리는 시각(분). 이보다 앞 칸은 "오픈 전" */
      openedAt?: number;
      interval?: number;
      planStart?: string;
      planEnd?: string;
      setupMinutes?: number;
      maxStreakMinutes?: number;
    }
  | { type: "clearPlan" }
  | { type: "setShare"; on: boolean }
  | { type: "savePlan"; plan: RotationPlan | null }
  | { type: "setTable"; label: number; button?: number | null; closedAt?: number | null }
  | { type: "createGame"; name: string; workDate: string; copyDealers?: boolean; copySettings?: boolean }
  | { type: "setGame"; name?: string; workDate?: string }
  | { type: "deleteGame" }
  /** 지난 게임 여러 개 한꺼번에 지우기(지금 보는 게임은 남김) */
  | { type: "deleteGames"; ids: string[] }
  /** 휴지통(지운 지 7일 안)에서 게임 되살리기 */
  | { type: "restoreGame"; trashId: string }
  /** 공유 링크 열림 기간(asDefault면 새 게임 기본값으로도 저장) */
  | { type: "setShareDays"; days: number; asDefault?: boolean }
  /** 딜러 명단 따로 저장(계정마다 · 게임과 상관없이 남음). id가 있으면 고치기 */
  | { type: "saveRoster"; id?: string; name: string; text: string }
  | { type: "deleteRoster"; id: string };

/** 따로 저장한 딜러 명단(한 줄에 한 명: "김딜러 10:00" 형식) */
export type RotationRoster = { id: string; name: string; text: string };
/** 휴지통의 게임(지운 시각부터 TRASH_DAYS일 뒤 완전히 지움) */
export type RotationTrash = { id: string; name: string; workDate: string | null; deletedAt: string };
export const TRASH_DAYS = 7;
export const MAX_ROSTERS = 10;
/** 명단 한 개 글자 수 상한(150명 × 한 줄) */
export const ROSTER_TEXT_MAX = 6000;

/** 최대 연속 딜 선택지(분). 0 = 제한 없음 */
export const MAX_STREAK_CHOICES = [0, 40, 60, 80, 100, 120] as const;

/** 보기 전용 화면에 보내는 상태(이름·배정만, 출근 기록 시각 등은 빼고) */
export type RotationShareView = {
  game: RotationGame;
  version: number;
  tableLabels: number[];
  tableState: Record<string, TableState>;
  interval: number;
  planStart: string;
  plan: RotationPlan | null;
  dealers: { id: string; name: string; status: DealerStatus }[];
};

/** 한국 날짜 "YYYY-MM-DD" */
export function kstDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * 보기 전용 링크가 끝났는지: 근무일 다음 날(밤샘 대회 고려)까지만 열립니다.
 * 날짜가 없으면 끝나지 않은 것으로 봅니다.
 */
/** 공유 링크 열림 기간 선택: 근무일 + n일까지(0 = 계속) */
export const SHARE_DAY_CHOICES = [
  { days: 1, label: "근무일 다음 날까지" },
  { days: 3, label: "근무일 3일 뒤까지" },
  { days: 0, label: "계속(공유를 끌 때까지)" },
] as const;

/** 공유 링크가 닫혔는지: 근무일 + days일이 지나면 닫힘(days 0이면 안 닫힘) */
export function shareExpired(workDate: string | null, today = kstDate(), days = 1) {
  if (days <= 0 || !workDate || !normalizeWorkDate(workDate)) return false;
  const [y, m, d] = workDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  return today > lastDay;
}

/** "2026-10-13" → "10/13(화)" */
export function formatWorkDate(value: string | null) {
  if (!value || !normalizeWorkDate(value)) return "날짜 없음";
  const [y, m, d] = value.split("-").map(Number);
  const day = "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}/${d}(${day})`;
}

/** 날짜 입력 확인 */
export function normalizeWorkDate(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? text : null;
}

/** 예전 값(근무중·휴식)은 출근으로 봅니다. */
export function toDealerStatus(value: string): DealerStatus {
  if ((DEALER_STATUSES as readonly string[]).includes(value)) return value as DealerStatus;
  if (value === "WORKING" || value === "BREAK") return "IN";
  return "WAIT";
}

/** "18:00" · "1800" · "6시" → "18:00"(못 읽으면 null) */
export function normalizeTime(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  const m = /^(\d{1,2})\s*(?::|시)?\s*(\d{2})?\s*(?:분)?$/.exec(text);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "홍길동 18:00" 또는 "홍길동 18:00-02:00"(출근-퇴근) 한 줄씩 → 딜러 목록(시간은 선택) */
export function parseDealerLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const span = /^(.*?)[\s,\t]+(\d{1,2}\s*(?::|시)?\s*\d{0,2}\s*분?)\s*[-~]\s*(\d{1,2}\s*(?::|시)?\s*\d{0,2}\s*분?)$/.exec(line);
      const spanStart = span ? normalizeTime(span[2]) : null;
      const spanEnd = span ? normalizeTime(span[3]) : null;
      if (span && spanStart && spanEnd) return { name: span[1].trim().slice(0, 20), startTime: spanStart, endTime: spanEnd as string | null };
      const m = /^(.*?)[\s,\t]+(\d{1,2}\s*(?::|시)?\s*\d{0,2}\s*분?)$/.exec(line);
      const time = m ? normalizeTime(m[2]) : null;
      return { name: (time && m ? m[1] : line).trim().slice(0, 20), startTime: time, endTime: null as string | null };
    })
    .filter((row) => row.name);
}

/** ISO 시각 → 한국 시간 "HH:MM" */
export function kstClock(iso: string | Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

/** "HH:MM"(한국 시각)을 near에 가장 가까운 날짜의 Date로(밤샘 근무 고려) */
export function kstDateAt(clock: string, near: Date) {
  const [h, m] = clock.split(":").map(Number);
  const kst = new Date(near.getTime() + 9 * 3600_000);
  const base = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), h, m) - 9 * 3600_000;
  const options = [base - 86_400_000, base, base + 86_400_000];
  options.sort((a, b) => Math.abs(a - near.getTime()) - Math.abs(b - near.getTime()));
  return new Date(options[0]);
}

/** 지금 시각(분, 시작 시각 기준으로 밤샘 펴기) */
export function nowMinutes(start: number, now = new Date()) {
  return alignToStart(parseClock(kstClock(now)) ?? 0, start);
}

/**
 * 시간표에 넣을 딜러와 일할 수 있는 시간.
 * 출근 체크했으면 그 시각부터, 아니면 예정 출근 시각(없으면 시작 시각)부터. 휴무는 빼고, 퇴근은 그 시각까지.
 */
export function planDealers(dealers: RotationDealerView[], start: number): PlanDealer[] {
  return dealers
    .filter((d) => d.status !== "OFF")
    .map((d) => {
      const fromClock = d.checkedInAt ? parseClock(kstClock(d.checkedInAt)) : parseClock(d.startTime ?? "");
      const from = fromClock == null ? start : alignToStart(fromClock, start);
      if (d.status === "LEFT") {
        // 퇴근: 출근 체크가 있으면 실제 일한 시간만큼(밤샘에도 안 틀림), 없으면 퇴근 시각. 출근보다 이르면 시간표에서 뺌
        if (d.checkedInAt && d.leftAt) {
          const worked = Math.max(0, Math.round((new Date(d.leftAt).getTime() - new Date(d.checkedInAt).getTime()) / 60_000));
          return { id: d.id, from, to: from + worked };
        }
        const leftClock = d.leftAt ? parseClock(kstClock(d.leftAt)) : null;
        const left = leftClock == null ? from : alignToStart(leftClock, start);
        return { id: d.id, from, to: Math.max(from, left) };
      }
      // 예정 퇴근 시각까지(출근보다 이르면 다음 날 새벽)
      const endClock = parseClock(d.endTime ?? "");
      let to = endClock == null ? null : alignToStart(endClock, start);
      if (to != null && to <= from) to += 1440;
      return { id: d.id, from, to };
    });
}

/**
 * 테이블 이름: 숫자(1~999) 또는 알파벳(A~Z). 알파벳은 안에서 1001(A)~1026(Z)으로 다룹니다
 * (시간표 · 버튼 자리 기록이 숫자 기준이라 그대로 씀).
 */
export const LETTER_BASE = 1000;
const isLetterLabel = (n: number) => n > LETTER_BASE && n <= LETTER_BASE + 26;
const validLabel = (n: number) => (n >= 1 && n <= 999) || isLetterLabel(n);

/** 1 → "1", 1001 → "A" (입력칸 · 저장용) */
export function labelText(label: number) {
  return isLetterLabel(label) ? String.fromCharCode(64 + label - LETTER_BASE) : String(label);
}

/**
 * 화면에 보일 테이블 이름: 숫자는 "T1", 알파벳은 "A" 그대로(TA처럼 헷갈리지 않게).
 * 문장 안에서는 tableWord(예: "T1 테이블", "A 테이블").
 */
export function tableTag(label: number) {
  return isLetterLabel(label) ? labelText(label) : `T${label}`;
}
export const tableWord = (label: number) => `${tableTag(label)} 테이블`;

function labelValue(token: string): number | null {
  if (/^\d{1,3}$/.test(token)) return Number(token);
  if (/^[A-Za-z]$/.test(token)) return LETTER_BASE + token.toUpperCase().charCodeAt(0) - 64;
  return null;
}

/** "5-12, 15, A-D" → [5,…,12,15,1001,…,1004]. 중복은 빼고 최대 MAX_TABLES개. 못 읽은 부분은 errors로 */
export function parseTableLabels(text: string): { labels: number[]; errors: string[] } {
  const labels: number[] = [];
  const errors: string[] = [];
  for (const raw of text.split(/[,\s/]+/).filter(Boolean)) {
    const range = /^([0-9]{1,3}|[A-Za-z])\s*[-~]\s*([0-9]{1,3}|[A-Za-z])$/.exec(raw);
    const single = labelValue(raw);
    if (range) {
      const a = labelValue(range[1]);
      const b = labelValue(range[2]);
      // 숫자-숫자 · 알파벳-알파벳만(1-C 같은 섞인 범위는 못 읽음)
      if (a == null || b == null || isLetterLabel(a) !== isLetterLabel(b)) {
        errors.push(raw);
        continue;
      }
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let n = lo; n <= hi && labels.length < MAX_TABLES * 3; n += 1) labels.push(n);
    } else if (single != null) {
      labels.push(single);
    } else {
      errors.push(raw);
    }
  }
  const unique = [...new Set(labels.filter(validLabel))];
  if (unique.length > MAX_TABLES) errors.push(`테이블은 최대 ${MAX_TABLES}개입니다`);
  return { labels: unique.slice(0, MAX_TABLES), errors };
}

/** [5,6,7,8,12,1001,1002,1003] → "5-8, 12, A-C" */
export function formatTableLabels(labels: number[]) {
  const sorted = [...labels];
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1;
    const [a, b] = [labelText(sorted[i]), labelText(sorted[j])];
    parts.push(j > i + 1 ? `${a}-${b}` : j === i + 1 ? `${a}, ${b}` : a);
    i = j + 1;
  }
  return parts.join(", ");
}

/** 저장된 테이블 번호(없으면 1번부터 tableCount개) */
export function tableLabelsOf(state: { tableCount: number; tableLabels?: number[] | null }) {
  return state.tableLabels && state.tableLabels.length === state.tableCount
    ? state.tableLabels
    : Array.from({ length: state.tableCount }, (_, i) => i + 1);
}
