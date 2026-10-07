export const MARK_CATEGORIES = [
  { id: "TEAM" as const, label: "팀 마크" },
  { id: "LEVEL" as const, label: "레벨 마크" },
  { id: "SPECIAL" as const, label: "특수 마크" },
];

export type MarkCategoryId = (typeof MARK_CATEGORIES)[number]["id"];

export const SHOP_KINDS = [
  { id: "MARK" as const, label: "마크" },
  { id: "FRAME" as const, label: "프레임" },
  { id: "EFFECT" as const, label: "이펙트" },
];

export type ShopKindId = (typeof SHOP_KINDS)[number]["id"];

export type MarkCatalogItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  pricePoints: number;
  minLevel: number;
  category: MarkCategoryId;
  owned: boolean;
  equipped: boolean;
};

export type CosmeticCatalogItem = {
  id: string;
  slug: string;
  name: string;
  kind: "FRAME" | "EFFECT";
  imageUrl: string | null;
  cssClass: string | null;
  pricePoints: number;
  minLevel: number;
  owned: boolean;
  equipped: boolean;
};

export type MarkCatalog = {
  points: number;
  level: number;
  isMaster?: boolean;
  isAdmin?: boolean;
  equippedMarkId: string | null;
  equippedFrameId: string | null;
  equippedEffectId: string | null;
  marks: MarkCatalogItem[];
  frames: CosmeticCatalogItem[];
  effects: CosmeticCatalogItem[];
};

export function marksInCategory(marks: MarkCatalogItem[], category: MarkCategoryId) {
  return marks.filter((mark) => mark.category === category);
}
