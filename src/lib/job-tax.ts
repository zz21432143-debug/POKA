import type { JobKind } from "@/generated/prisma/enums";

/** 3.3% 공제 여부를 꼭 고르는 분류: 지원 딜러·대회 딜러·급구/대타 */
export const TAX_KINDS: readonly JobKind[] = ["APPLY", "TOURNAMENT", "URGENT"];

export type JobTax = "공제" | "없음";

export const TAX_OPTIONS: { value: JobTax; label: string }[] = [
  { value: "공제", label: "3.3% 공제" },
  { value: "없음", label: "공제 없음" },
];

export function needsTax(jobKind: string | null | undefined) {
  return (TAX_KINDS as readonly string[]).includes(jobKind ?? "");
}

export function parseTax(value: unknown): JobTax | null {
  return value === "공제" || value === "없음" ? value : null;
}

export function taxLabel(value: string | null | undefined): string | null {
  return value === "공제" ? "3.3% 공제" : value === "없음" ? "공제 없음" : null;
}

/** 카톡 공고 원문에서 3.3% 공제 여부를 찾습니다. 못 찾으면 null. */
export function detectTax(text: string): JobTax | null {
  const t = text.replace(/\s+/g, " ");
  if (/(3\.3\s*%?\s*(공제\s*)?(없음|x|미공제|안\s*함|안\s*뗌|제외\s*없음)|미공제|공제\s*(없음|x|안\s*함)|세금\s*(없음|x))/i.test(t)) return "없음";
  if (/3\.3\s*%?/.test(t) || /(원천\s*징수|세금\s*공제|사업\s*소득\s*공제)/.test(t)) return "공제";
  return null;
}
