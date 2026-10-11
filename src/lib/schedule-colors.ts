/**
 * 대회 캘린더 색. 대회마다 한눈에 구분되도록 색상(빨·파·노·보·초·주…)이 확실히 다른 12색을 씁니다.
 * 형광처럼 눈부시지 않게 밝기만 살짝 낮췄고, 글자는 어두운 색으로 올려 읽기 쉽게 합니다.
 *
 * 한 달 안에서는 시작일 순서대로 아래 순서(서로 먼 색끼리 번갈아)로 나눠 주므로 이웃한 대회끼리 비슷해 보이지 않습니다.
 * 같은 대회(같은 이름)는 그 달 안에서 늘 같은 색입니다.
 */
export const SCHEDULE_PALETTE = [
  "#ef7b7b", // 빨강
  "#6fb1f5", // 파랑
  "#f2cf5b", // 노랑
  "#c08cf0", // 보라
  "#7fd18b", // 초록
  "#f5a35c", // 주황
  "#5fd4e6", // 하늘
  "#f28dc4", // 분홍
  "#b9dd5e", // 연두
  "#9aa0f5", // 남색
  "#4fd1b3", // 청록
  "#d9b48a", // 베이지
] as const;

/** 칩 글자색(밝은 바탕 위 어두운 글자) */
export const SCHEDULE_TEXT = "#1c1712";

/**
 * 보이는 달(또는 목록)의 대회들에 색을 나눠 줍니다. 시작일·이름 순서로 팔레트를 차례로 씁니다.
 * 반환: 대회 이름(소문자) → 색
 */
export function assignScheduleColors(events: { title: string; eventDate: string | null }[]): Map<string, string> {
  const byTitle = new Map<string, string>();
  const sorted = [...events].sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "") || a.title.localeCompare(b.title));
  for (const event of sorted) {
    const key = event.title.trim().toLowerCase();
    if (byTitle.has(key)) continue;
    byTitle.set(key, SCHEDULE_PALETTE[byTitle.size % SCHEDULE_PALETTE.length]);
  }
  return byTitle;
}

/** 이름 → 색. 목록에 없으면 이름으로 정한 고정 색. */
export function colorFor(colors: Map<string, string>, title: string) {
  const known = colors.get(title.trim().toLowerCase());
  if (known) return known;
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SCHEDULE_PALETTE[h % SCHEDULE_PALETTE.length];
}
