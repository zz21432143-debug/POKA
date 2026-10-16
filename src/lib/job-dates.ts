/**
 * 구인 공고 본문의 일정 줄(「10월 18일 (일) PM 2:00 - 2명」 · 「10/18(토) …」)에서 날짜를 읽어
 * 오늘보다 지난 줄은 따로 모음(글 화면에서 접어 두기 · 매번 글을 고치지 않아도 되게).
 */
const KR_DATE = /(\d{1,2})\s*월\s*(\d{1,2})\s*일/;
const SLASH_DATE = /(?:^|[^\d])(\d{1,2})\/(\d{1,2})(?=\s*\(|\s|$)/;

/** 줄에 적힌 날짜(YYYY-MM-DD) — 연도는 오늘과 가까운 쪽(연말 · 연초 넘어가는 공고도) */
export function lineDate(line: string, today: string): string | null {
  const m = line.match(KR_DATE) ?? line.match(SLASH_DATE);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const [ty, tm] = today.split("-").map(Number);
  let year = ty;
  if (month - tm > 6) year -= 1;
  else if (tm - month > 6) year += 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 지난 날짜 줄을 빼고 남은 본문 · 빠진 줄 */
export function splitPastScheduleLines(text: string, today: string): { current: string; past: string[] } {
  const past: string[] = [];
  const keep: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const d = lineDate(line, today);
    if (d && d < today) past.push(line.trim());
    else keep.push(line);
  }
  return { current: keep.join("\n"), past };
}
