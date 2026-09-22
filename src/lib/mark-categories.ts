export const MARK_CATEGORIES = [
  { id: "TEAM" as const, label: "팀 마크" },
  { id: "LEVEL" as const, label: "레벨 마크" },
  { id: "SPECIAL" as const, label: "특수 마크" },
];

export type MarkCategoryId = (typeof MARK_CATEGORIES)[number]["id"];

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

export function marksInCategory(marks: MarkCatalogItem[], category: MarkCategoryId) {
  return marks.filter((mark) => mark.category === category);
}
