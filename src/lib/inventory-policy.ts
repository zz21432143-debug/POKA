export const SPONSOR_PLACEMENTS = ["SIDEBAR", "NATIVE"] as const;
export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number];

export type DirectCreative = {
  placement: SponsorPlacement;
  imageUrl: string | null;
  href: string;
  title: string;
  advertiser: string;
  mark: "AD" | "제휴";
};

export function normalizeMark(value?: string | null, isPaid?: boolean): "AD" | "제휴" {
  if (isPaid) return "AD";
  if (value === "AD" || value === "광고") return "AD";
  return "제휴";
}

export function isDirectFilled(
  unit: { enabled?: boolean; imageUrl?: string | null; title?: string | null } | null,
  needImage: boolean,
) {
  if (!unit || unit.enabled === false) return false;
  if (needImage) return Boolean(unit.imageUrl);
  return Boolean(unit.title?.trim() || unit.imageUrl);
}

export function pickFill(
  direct: DirectCreative | null,
  empty: "adsense" | "cta" | "hide",
  needImage = false,
): { kind: "direct"; creative: DirectCreative } | { kind: "adsense" } | { kind: "cta" } | { kind: "hide" } {
  if (isDirectFilled(direct, needImage) && direct) {
    return { kind: "direct", creative: direct };
  }
  if (empty === "adsense") return { kind: "adsense" };
  if (empty === "hide") return { kind: "hide" };
  return { kind: "cta" };
}
