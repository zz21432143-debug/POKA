export type KingMarkDef = {
  slug: string;
  name: string;
  imageUrl: string;
};

/** 주간 랭킹 1위에게 4종 중 1종을 무작위로 지급합니다. */
export const FOUR_KINGS_MARKS: KingMarkDef[] = [
  { slug: "yokai-jiguk", name: "지국천왕", imageUrl: "/marks/yokai/jiguk.png" },
  { slug: "yokai-jeungjang", name: "증장천왕", imageUrl: "/marks/yokai/jeungjang.png" },
  { slug: "yokai-gwangmok", name: "광목천왕", imageUrl: "/marks/yokai/gwangmok.png" },
  { slug: "yokai-damun", name: "다문천왕", imageUrl: "/marks/yokai/damun.png" },
];

const KING_SLUGS = new Set(FOUR_KINGS_MARKS.map((mark) => mark.slug));

export function isKingSlug(slug: string) {
  return KING_SLUGS.has(slug);
}

export function pickUnusedKingSlug(owned: Iterable<string>, roll = Math.random) {
  const have = new Set(owned);
  const open = FOUR_KINGS_MARKS.filter((mark) => !have.has(mark.slug));
  if (open.length === 0) return null;
  return open[Math.floor(roll() * open.length)]!.slug;
}
