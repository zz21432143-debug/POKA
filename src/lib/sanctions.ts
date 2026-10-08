export const SANCTION_ACTIONS = ["suspend1", "suspend3", "suspend7", "suspend30", "ban", "lift"] as const;
export type SanctionAction = (typeof SANCTION_ACTIONS)[number];

export const SANCTION_BUTTONS: { action: Exclude<SanctionAction, "lift">; label: string }[] = [
  { action: "suspend1", label: "1일 정지" },
  { action: "suspend3", label: "3일 정지" },
  { action: "suspend7", label: "7일 정지" },
  { action: "suspend30", label: "30일 정지" },
  { action: "ban", label: "영구 정지" },
];

export function isSanctionAction(value: string | undefined): value is SanctionAction {
  return Boolean(value && (SANCTION_ACTIONS as readonly string[]).includes(value));
}

export function untilFor(action: SanctionAction): Date | null {
  const day = 24 * 60 * 60 * 1000;
  if (action === "suspend1") return new Date(Date.now() + 1 * day);
  if (action === "suspend3") return new Date(Date.now() + 3 * day);
  if (action === "suspend7") return new Date(Date.now() + 7 * day);
  if (action === "suspend30") return new Date(Date.now() + 30 * day);
  return null;
}
