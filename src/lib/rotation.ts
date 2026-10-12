/**
 * 딜러 로테이션 공용 규칙(서버·화면 공통, DB 없이 계산만).
 * 딜러 상태: WAIT 출근 전 · IN 출근 · OFF 휴무 · LEFT 퇴근
 * 근무·휴식은 시간표(rotation-plan)로 정합니다.
 */
import { alignToStart, parseClock, type PlanDealer, type RotationPlan } from "@/lib/rotation-plan";

export const MAX_TABLES = 40;
export const MAX_DEALERS = 55;
export const INTERVAL_CHOICES = [10, 15, 20, 25, 30, 40, 45, 60] as const;

export const DEALER_STATUSES = ["WAIT", "IN", "OFF", "LEFT"] as const;
export type DealerStatus = (typeof DEALER_STATUSES)[number];

export const STATUS_LABEL: Record<DealerStatus, string> = {
  WAIT: "출근 전",
  IN: "출근",
  OFF: "휴무",
  LEFT: "퇴근",
};

export type TableState = { button?: number | null; closedAt?: number | null };

/** 시간표 테이블 순서대로 컨바인 시각(없으면 null) */
export function closedFromOf(labels: number[], tableState: Record<string, TableState>) {
  return labels.map((label) => tableState[String(label)]?.closedAt ?? null);
}

export type RotationDealerView = {
  id: string;
  name: string;
  /** 예정 출근 시각 "18:00" */
  startTime: string | null;
  status: DealerStatus;
  /** 실제 출근 체크 시각(ISO) */
  checkedInAt: string | null;
  leftAt: string | null;
  sort: number;
};

export type RotationStateView = {
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
};

export type RotationAction =
  | { type: "addDealers"; dealers: { name: string; startTime?: string | null }[] }
  | { type: "updateDealer"; id: string; name?: string; startTime?: string | null }
  | { type: "removeDealer"; id: string }
  | { type: "checkIn"; id: string }
  | { type: "setStatus"; id: string; status: "WAIT" | "OFF" | "LEFT" }
  | { type: "setSettings"; tableLabels?: string; interval?: number; planStart?: string; planEnd?: string; setupMinutes?: number }
  | { type: "savePlan"; plan: RotationPlan | null }
  | { type: "setTable"; label: number; button?: number | null; closedAt?: number | null }
  | { type: "newDay" };

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

/** "홍길동 18:00" 한 줄씩 → 딜러 목록(시간은 선택) */
export function parseDealerLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = /^(.*?)[\s,\t]+(\d{1,2}\s*(?::|시)?\s*\d{0,2}\s*분?)$/.exec(line);
      const time = m ? normalizeTime(m[2]) : null;
      return { name: (time && m ? m[1] : line).trim().slice(0, 20), startTime: time };
    })
    .filter((row) => row.name);
}

/** ISO 시각 → 한국 시간 "HH:MM" */
export function kstClock(iso: string | Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
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
      const leftClock = d.status === "LEFT" && d.leftAt ? parseClock(kstClock(d.leftAt)) : null;
      return { id: d.id, from, to: leftClock == null ? null : alignToStart(leftClock, start) };
    });
}

/** "5-12, 15, 18" → [5,6,…,12,15,18]. 중복은 빼고 최대 40개. 못 읽은 부분은 errors로 */
export function parseTableLabels(text: string): { labels: number[]; errors: string[] } {
  const labels: number[] = [];
  const errors: string[] = [];
  for (const raw of text.split(/[,\s/]+/).filter(Boolean)) {
    const range = /^(\d{1,3})\s*[-~]\s*(\d{1,3})$/.exec(raw);
    const single = /^(\d{1,3})$/.exec(raw);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let n = lo; n <= hi && labels.length < MAX_TABLES * 3; n += 1) labels.push(n);
    } else if (single) {
      labels.push(Number(single[1]));
    } else {
      errors.push(raw);
    }
  }
  const unique = [...new Set(labels.filter((n) => n >= 1 && n <= 999))];
  if (unique.length > MAX_TABLES) errors.push(`테이블은 최대 ${MAX_TABLES}개입니다`);
  return { labels: unique.slice(0, MAX_TABLES), errors };
}

/** [5,6,7,8,12] → "5-8, 12" */
export function formatTableLabels(labels: number[]) {
  const sorted = [...labels];
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1;
    parts.push(j > i + 1 ? `${sorted[i]}-${sorted[j]}` : j === i + 1 ? `${sorted[i]}, ${sorted[j]}` : `${sorted[i]}`);
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
