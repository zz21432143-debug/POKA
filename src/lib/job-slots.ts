import { lineDate } from "@/lib/job-dates";
import { parseJobEvents } from "@/lib/job-events";

/**
 * 빈자리 보드: 구인 공고 한 개를 「날짜 · 시간 · 인원」 줄(빈자리)로 쪼갬.
 * 본문(카톡 공고 붙여넣기)의 날짜 줄이 먼저 · 없으면 일정 칸(jobEvents) · 그것도 없으면 근무일.
 * 줄에 「마감」이라고 적으면 그 줄은 마감으로 봄(글을 지우지 않아도 됨).
 */
export type SlotLine = {
  date: string;
  /** "14:00" · 없으면 null */
  time: string | null;
  /** "2명" · 없으면 null */
  count: string | null;
  /** 지점 · 행사 이름(「• 잠실 방이점」 줄) */
  branch: string | null;
  closed: boolean;
};

const BRANCH_MARK = /^[•·\-▶■◆★▪●○◎※]+\s*/;
const DATE_PART = /(\d{1,2})\s*월\s*(\d{1,2})\s*일|(?:^|[^\d])(\d{1,2})\/(\d{1,2})/;

const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** 날짜를 뺀 나머지에서 시작 시각 읽기(PM 2:00 · 오후 6시 · 18:00 · 6시) */
export function readTime(rest: string): string | null {
  const ap = rest.match(/(AM|PM|오전|오후)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (ap) {
    let h = Number(ap[2]);
    const pm = /PM|오후/i.test(ap[1]);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h < 24 ? hhmm(h, Number(ap[3] ?? 0)) : null;
  }
  const colon = rest.match(/(\d{1,2}):(\d{2})/);
  if (colon && Number(colon[1]) < 24) return hhmm(Number(colon[1]), Number(colon[2]));
  const si = rest.match(/(\d{1,2})\s*시/);
  if (si && Number(si[1]) < 24) return hhmm(Number(si[1]), 0);
  return null;
}

/** 본문 → 빈자리 줄 */
export function slotsFromText(text: string, today: string): SlotLine[] {
  const out: SlotLine[] = [];
  let branch: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const date = lineDate(line, today);
    if (!date) {
      // 지점 줄: 「• 잠실 방이점」 · 「분당 서현점」
      if ((BRANCH_MARK.test(line) || /(점|지점|매장|홀덤)\s*$/.test(line)) && line.length <= 32) {
        branch = line.replace(BRANCH_MARK, "").trim() || branch;
      }
      continue;
    }
    const rest = line.replace(DATE_PART, " ").replace(/\([월화수목금토일]\)/, " ");
    const count = rest.match(/(\d{1,3})\s*명/);
    out.push({
      date,
      time: readTime(rest),
      count: count ? `${count[1]}명` : null,
      branch,
      closed: /마감|완료|구인\s*끝|full/i.test(rest),
    });
  }
  return out;
}

export type SlotSource = {
  content: string | null;
  jobEvents?: string | null;
  jobWorkDate?: string | null;
  jobWorkHours?: string | null;
  jobHeadcount?: string | null;
};

/** 공고 하나 → 빈자리 줄(본문 → 일정 칸 → 근무일 순) */
export function slotsForPost(post: SlotSource, today: string): SlotLine[] {
  const fromText = slotsFromText(post.content ?? "", today);
  if (fromText.length) return fromText;
  const events = parseJobEvents(post.jobEvents);
  if (events.length) {
    return events.map((e) => ({ date: e.date, time: null, count: e.headcount ? (/명/.test(e.headcount) ? e.headcount : `${e.headcount}명`) : null, branch: e.name ?? null, closed: false }));
  }
  if (post.jobWorkDate && /^\d{4}-\d{2}-\d{2}$/.test(post.jobWorkDate)) {
    return [{ date: post.jobWorkDate, time: post.jobWorkHours ? readTime(post.jobWorkHours) : null, count: post.jobHeadcount ? (/명/.test(post.jobHeadcount) ? post.jobHeadcount : `${post.jobHeadcount}명`) : null, branch: null, closed: false }];
  }
  return [];
}

/** 오늘 이후 · 마감 아닌 줄(날짜 · 시간 순) */
export function openSlots(post: SlotSource, today: string) {
  return slotsForPost(post, today)
    .filter((s) => s.date >= today && !s.closed)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));
}
