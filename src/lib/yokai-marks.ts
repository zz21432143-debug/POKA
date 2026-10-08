export type YokaiMarkDef = {
  slug: string;
  name: string;
  imageUrl: string;
  pricePoints: number;
};

/** 포인트 상점 요괴 마크. 1차 500·1,000P, 2차 500·1,500P. */
export const YOKAI_MARKS: YokaiMarkDef[] = [
  { slug: "yokai-shrine", name: "신사", imageUrl: "/marks/yokai/shrine.png", pricePoints: 500 },
  { slug: "yokai-fox", name: "여우 요괴", imageUrl: "/marks/yokai/fox.png", pricePoints: 500 },
  { slug: "yokai-oni", name: "오니", imageUrl: "/marks/yokai/oni.png", pricePoints: 500 },
  { slug: "yokai-tanuki", name: "너구리 요괴", imageUrl: "/marks/yokai/tanuki.png", pricePoints: 500 },
  { slug: "yokai-tengu", name: "텐구", imageUrl: "/marks/yokai/tengu.png", pricePoints: 500 },
  { slug: "yokai-ghost", name: "귀신", imageUrl: "/marks/yokai/ghost.png", pricePoints: 1000 },
  { slug: "yokai-flame", name: "요괴불", imageUrl: "/marks/yokai/flame.png", pricePoints: 1000 },
  { slug: "yokai-skull", name: "해골 요괴", imageUrl: "/marks/yokai/skull.png", pricePoints: 1000 },
  { slug: "yokai-eye", name: "눈알 요괴", imageUrl: "/marks/yokai/eye.png", pricePoints: 1000 },
  { slug: "yokai-gourd", name: "호리병", imageUrl: "/marks/yokai/gourd.png", pricePoints: 1000 },
  { slug: "yokai-fox-maple", name: "여우 요괴", imageUrl: "/marks/yokai/fox-maple.png", pricePoints: 500 },
  { slug: "yokai-tengu-elder", name: "텐구", imageUrl: "/marks/yokai/tengu-elder.png", pricePoints: 800 },
  { slug: "yokai-lantern", name: "등불 요괴", imageUrl: "/marks/yokai/lantern.png", pricePoints: 1000 },
  { slug: "yokai-kappa", name: "카파", imageUrl: "/marks/yokai/kappa.png", pricePoints: 1000 },
  { slug: "yokai-jibakurei", name: "지박령", imageUrl: "/marks/yokai/jibakurei.png", pricePoints: 1200 },
  { slug: "yokai-jorogumo", name: "죠로그모", imageUrl: "/marks/yokai/jorogumo.png", pricePoints: 800 },
  { slug: "yokai-demon", name: "악마 요괴", imageUrl: "/marks/yokai/demon.png", pricePoints: 1200 },
  { slug: "yokai-hydra", name: "삼두사", imageUrl: "/marks/yokai/hydra.png", pricePoints: 1500 },
  { slug: "yokai-cyclops", name: "외눈 도깨비", imageUrl: "/marks/yokai/cyclops.png", pricePoints: 1500 },
  { slug: "yokai-biwa", name: "거문고 유령", imageUrl: "/marks/yokai/biwa.png", pricePoints: 1500 },
];

const YOKAI_SLUGS = new Set(YOKAI_MARKS.map((mark) => mark.slug));

export function isYokaiSlug(slug: string) {
  return YOKAI_SLUGS.has(slug);
}
