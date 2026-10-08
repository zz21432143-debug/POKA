/** Asia/Seoul 달력 날짜 YYYY-MM-DD. 출석 00시 기준. */
export function todayKstDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function yesterdayKstDate(today = todayKstDate()): string {
  return shiftDate(today, -1);
}

export function weekStartKst(today = todayKstDate()): string {
  const [year, month, day] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + mondayOffset);
  return utc.toISOString().slice(0, 10);
}

export function formatKstLabel(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

/** unstable_cache 이후 Date가 문자열로 내려와도 깨지지 않게 합니다. */
export function toIsoString(value: Date | string | number) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date(0).toISOString() : value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function formatRelativeKst(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}일 전`;
  return formatKstLabel(iso.slice(0, 10));
}
