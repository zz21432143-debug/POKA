import { YOKAI_ACHIEVEMENTS, isAchievementSlug } from "@/lib/yokai-achievements";
import { FOUR_KINGS_MARKS, isKingSlug } from "@/lib/yokai-kings";
import { KOREAN_LEGEND_MARKS, SHOP_MARKS, VILLAGE_CHIEF_MARK, YOKAI_MARKS, isChiefSlug, isShopMarkSlug } from "@/lib/yokai-marks";

export {
  FOUR_KINGS_MARKS,
  KOREAN_LEGEND_MARKS,
  SHOP_MARKS,
  YOKAI_ACHIEVEMENTS,
  YOKAI_MARKS,
  isAchievementSlug,
  isKingSlug,
  isShopMarkSlug,
};

export function isLockedRewardSlug(slug: string) {
  return isAchievementSlug(slug) || isKingSlug(slug) || isChiefSlug(slug);
}

export type MarkOffer = "shop" | "level" | "ranking" | "collection";

export function markOffer(slug: string): MarkOffer {
  if (isChiefSlug(slug)) return "collection";
  if (isAchievementSlug(slug)) return "level";
  if (isKingSlug(slug)) return "ranking";
  return "shop";
}

export function markPriceTag(opts: { slug: string; pricePoints: number }) {
  const offer = markOffer(opts.slug);
  if (offer === "level") return "구매 불가 / 비매품";
  if (offer === "ranking") return "랭킹 보상";
  if (offer === "collection") return "도감 완성 보상";
  return `${opts.pricePoints.toLocaleString()} P`;
}

export const CATALOG_MARKS = [
  ...SHOP_MARKS,
  VILLAGE_CHIEF_MARK,
  ...YOKAI_ACHIEVEMENTS.map((mark) => ({
    slug: mark.slug,
    name: mark.name,
    imageUrl: mark.imageUrl,
    pricePoints: 0,
  })),
  ...FOUR_KINGS_MARKS.map((mark) => ({
    slug: mark.slug,
    name: mark.name,
    imageUrl: mark.imageUrl,
    pricePoints: 0,
  })),
];
