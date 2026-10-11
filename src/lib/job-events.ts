/**
 * 대회·지원 딜러 공고의 여러 날짜 일정.
 * 날짜마다 행사명(선택)·인원(선택)을 붙여 Post.jobEvents에 JSON으로 저장합니다.
 * 첫 날짜는 jobWorkDate, 마지막 날짜는 jobEndDate로도 저장해 자동 마감·정렬에 씁니다.
 */
export type JobEvent = { date: string; name?: string; headcount?: string };

/** 같은 행사명으로 이어지는 날짜를 묶은 한 줄 (예: 12/23~12/27) */
export type JobEventGroup = { start: string; end: string; name: string; headcount: string };

export const MAX_JOB_EVENTS = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

export function weekdayKo(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return "일월화수목금토"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "2026-10-31" → "10/31(토)" */
export function dayLabel(date: string, withWeekday = true) {
  const [, m, d] = date.split("-").map(Number);
  return withWeekday ? `${m}/${d}(${weekdayKo(date)})` : `${m}/${d}`;
}

/** 요청 본문·폼 값 → 날짜 순으로 정리한 일정. 잘못된 날짜와 같은 날·같은 행사 중복은 버립니다. */
export function normalizeJobEvents(input: unknown): JobEvent[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: JobEvent[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const date = clean((row as Record<string, unknown>).date, 10);
    if (!DATE_RE.test(date)) continue;
    const name = clean((row as Record<string, unknown>).name, 40);
    const headcount = clean((row as Record<string, unknown>).headcount, 20);
    const key = `${date}|${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ date, ...(name ? { name } : {}), ...(headcount ? { headcount } : {}) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, MAX_JOB_EVENTS);
}

export function parseJobEvents(raw: string | null | undefined): JobEvent[] {
  if (!raw) return [];
  try {
    return normalizeJobEvents(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeJobEvents(events: JobEvent[]): string | null {
  return events.length > 0 ? JSON.stringify(events) : null;
}

/** 연속된 날짜이면서 행사명이 같으면 한 줄로 묶습니다. 인원은 첫날 값을 씁니다. */
export function groupJobEvents(events: JobEvent[]): JobEventGroup[] {
  const groups: JobEventGroup[] = [];
  for (const event of events) {
    const name = event.name ?? "";
    const last = groups[groups.length - 1];
    if (last && last.name === name && addDays(last.end, 1) === event.date && !event.headcount) {
      last.end = event.date;
      continue;
    }
    groups.push({ start: event.date, end: event.date, name, headcount: event.headcount ?? "" });
  }
  return groups;
}

export function groupDateLabel(group: { start: string; end: string }, withWeekday = true) {
  return group.start === group.end
    ? dayLabel(group.start, withWeekday)
    : `${dayLabel(group.start, withWeekday)}~${dayLabel(group.end, withWeekday)}`;
}

/** 제목·카드용 짧은 날짜: "10/24·10/31", "12/23~12/27", 많으면 "10/24 외 5일" */
export function eventsDateLabel(events: JobEvent[]): string {
  const groups = groupJobEvents(events.map((e) => ({ date: e.date })));
  if (groups.length === 0) return "";
  if (groups.length > 3) return `${dayLabel(groups[0].start, false)} 외 ${events.length - 1}일`;
  return groups.map((g) => groupDateLabel(g, false)).join("·");
}

/** 일정 한 줄씩: "MAIN EVENT · 10/31(토) · 65명" */
export function eventsScheduleLines(events: JobEvent[]): string[] {
  return groupJobEvents(events).map((g) =>
    [g.name, groupDateLabel(g), g.headcount].filter(Boolean).join(" · "),
  );
}

/** 날짜별 인원이 "65명"처럼 숫자면 합계를 냅니다. 숫자가 없으면 빈 값. */
export function eventsHeadcountTotal(events: JobEvent[]): string {
  let total = 0;
  let plus = false;
  for (const e of events) {
    const m = e.headcount?.match(/(\d+)/);
    if (m) total += Number(m[1]);
    if (e.headcount && /[+@]/.test(e.headcount)) plus = true;
  }
  return total > 0 ? `${total}명${plus ? "+@" : ""}` : "";
}
