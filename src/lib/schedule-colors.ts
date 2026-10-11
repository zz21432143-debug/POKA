/**
 * 대회 캘린더 색. 대회마다 다른 색을 주되, 어두운 바탕에서 눈이 편하도록 채도를 낮춘 색만 씁니다.
 * 같은 대회(같은 이름)는 어느 날짜에서든 같은 색이고, 한 달 안에서는 서로 다른 대회가 같은 색을 쓰지 않게 나눠 줍니다.
 */
export const SCHEDULE_PALETTE = [
  "#d98c8c", // 장미
  "#d9a46c", // 주황
  "#cdb35e", // 겨자
  "#9cbf6b", // 연두
  "#5fb3a3", // 청록
  "#6aaed6", // 하늘
  "#8a95d6", // 남보라
  "#b08ad1", // 보라
  "#d68ab3", // 분홍
  "#b39a86", // 갈색
  "#8fa6b3", // 회청
  "#7fbf8f", // 초록
] as const;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 대회 이름 → 기본 색 번호 */
export function baseColorIndex(title: string) {
  return hash(title.trim().toLowerCase()) % SCHEDULE_PALETTE.length;
}

/**
 * 보이는 달의 대회들에 색을 나눠 줍니다. 시작일 순서로 돌며 기본 색이 이미 다른 대회에 쓰였으면 다음 빈 색을 씁니다.
 * 반환: 대회 이름(소문자) → 색
 */
export function assignScheduleColors(events: { title: string; eventDate: string | null }[]): Map<string, string> {
  const byTitle = new Map<string, string>();
  const used = new Set<number>();
  const sorted = [...events].sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? "") || a.title.localeCompare(b.title));
  for (const event of sorted) {
    const key = event.title.trim().toLowerCase();
    if (byTitle.has(key)) continue;
    let idx = baseColorIndex(event.title);
    // 팔레트를 다 쓰기 전까지는 겹치지 않게
    for (let step = 0; step < SCHEDULE_PALETTE.length && used.has(idx); step += 1) {
      idx = (idx + 1) % SCHEDULE_PALETTE.length;
    }
    used.add(idx);
    byTitle.set(key, SCHEDULE_PALETTE[idx]);
  }
  return byTitle;
}

export function colorFor(colors: Map<string, string>, title: string) {
  return colors.get(title.trim().toLowerCase()) ?? SCHEDULE_PALETTE[baseColorIndex(title)];
}
