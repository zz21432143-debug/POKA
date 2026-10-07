export const POLL_CHOICES = [
  { id: "FOLD", label: "폴드" },
  { id: "CHECK", label: "체크" },
  { id: "CALL", label: "콜" },
  { id: "RAISE", label: "레이즈" },
] as const;

export type PollChoice = (typeof POLL_CHOICES)[number]["id"];

export function pollPercents(counts: Record<string, number>) {
  const total = POLL_CHOICES.reduce((sum, choice) => sum + (counts[choice.id] ?? 0), 0);
  return {
    total,
    bars: POLL_CHOICES.map((choice) => {
      const count = counts[choice.id] ?? 0;
      const percent = total === 0 ? 0 : Math.round((count / total) * 100);
      return { ...choice, count, percent };
    }),
  };
}
