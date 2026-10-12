/**
 * 딜러 로테이션 공용 규칙(서버·화면 공통, DB 없이 계산만).
 * 상태: WORKING 근무중(테이블 배정) · BREAK 휴식 · OFF 휴무 · LEFT 퇴근
 */

export const MAX_TABLES = 40;
export const MAX_DEALERS = 55;

export const DEALER_STATUSES = ["WORKING", "BREAK", "OFF", "LEFT"] as const;
export type DealerStatus = (typeof DEALER_STATUSES)[number];

export const STATUS_LABEL: Record<DealerStatus, string> = {
  WORKING: "근무중",
  BREAK: "휴식",
  OFF: "휴무",
  LEFT: "퇴근",
};

export type RotationDealerView = {
  id: string;
  name: string;
  startTime: string | null;
  status: DealerStatus;
  tableNo: number | null;
  statusSince: string;
  sort: number;
};

export type RotationEventView = { dealerId: string; status: DealerStatus; tableNo: number | null; at: string };

export type RotationStateView = {
  version: number;
  tableCount: number;
  dayStartedAt: string;
  dealers: RotationDealerView[];
  events: RotationEventView[];
};

export type RotationAction =
  | { type: "addDealers"; dealers: { name: string; startTime?: string | null }[] }
  | { type: "updateDealer"; id: string; name?: string; startTime?: string | null }
  | { type: "removeDealer"; id: string }
  | { type: "assign"; id: string; tableNo: number }
  | { type: "setStatus"; id: string; status: Exclude<DealerStatus, "WORKING"> }
  | { type: "clearTable"; tableNo: number }
  | { type: "setTableCount"; tableCount: number }
  | { type: "newDay" };

export function isDealerStatus(value: unknown): value is DealerStatus {
  return typeof value === "string" && (DEALER_STATUSES as readonly string[]).includes(value);
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

export type Segment = { status: DealerStatus; tableNo: number | null; from: number; to: number };

/** 딜러 한 명의 상태 구간(근무일 시작 이후). 마지막 구간은 지금까지 */
export function dealerSegments(events: RotationEventView[], dealerId: string, now: number, dayStart: number): Segment[] {
  const mine = events
    .filter((event) => event.dealerId === dealerId)
    .map((event) => ({ ...event, t: Math.max(new Date(event.at).getTime(), dayStart) }))
    .sort((a, b) => a.t - b.t);
  const out: Segment[] = [];
  mine.forEach((event, index) => {
    const to = index + 1 < mine.length ? mine[index + 1].t : now;
    if (to > event.t) out.push({ status: event.status, tableNo: event.tableNo, from: event.t, to });
  });
  return out;
}

/** 근무·휴식 합계(밀리초) */
export function dealerTotals(segments: Segment[]) {
  let work = 0;
  let rest = 0;
  for (const segment of segments) {
    const ms = segment.to - segment.from;
    if (segment.status === "WORKING") work += ms;
    else if (segment.status === "BREAK") rest += ms;
  }
  return { work, rest };
}

/** 1시간 5분 → "1:05", 7분 → "0:07" */
export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/** 지금 상태로 지낸 시간 "23분" / "1시간 5분" */
export function formatSince(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  if (minutes < 60) return `${minutes}분`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}
