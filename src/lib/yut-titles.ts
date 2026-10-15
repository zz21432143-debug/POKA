/** 윷놀이 승수로 붙는 요괴 칭호(닉네임 위 픽셀 배지) */
export const YUT_TITLES = [
  { min: 60, icon: "🐉", name: "전설의 윷쟁이", tone: "#ffcf4a" },
  { min: 30, icon: "🌕", name: "달빛 윷도사", tone: "#b77bff" },
  { min: 15, icon: "🔥", name: "강철의 폭주족", tone: "#ff5d6c" },
  { min: 5, icon: "👺", name: "도깨비 방망이", tone: "#3ddc97" },
  { min: 1, icon: "🥢", name: "새내기 윷쟁이", tone: "#8eeaff" },
] as const;

export type YutTitle = { icon: string; name: string; tone: string };

export function yutTitleFor(wins: number): YutTitle | null {
  const t = YUT_TITLES.find((x) => wins >= x.min);
  return t ? { icon: t.icon, name: t.name, tone: t.tone } : null;
}
