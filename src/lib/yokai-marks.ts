import { TEAM_MARK_FILES } from "@/lib/mark-assets";

export type YokaiMarkDef = {
  slug: string;
  name: string;
  imageUrl: string;
  pricePoints: number;
};

export const REGULAR_MARK_PRICE = 3000;
export const LEGEND_MARK_PRICE = 5000;

/** 상점 일반 마크. 일률 3,000P. */
export const YOKAI_MARKS: YokaiMarkDef[] = [
  { slug: "yokai-shrine", name: "신사", imageUrl: "/marks/yokai/shrine.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-fox", name: "여우 요괴", imageUrl: "/marks/yokai/fox.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-oni", name: "오니", imageUrl: "/marks/yokai/oni.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-tanuki", name: "너구리 요괴", imageUrl: "/marks/yokai/tanuki.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-tengu", name: "텐구", imageUrl: "/marks/yokai/tengu.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-ghost", name: "귀신", imageUrl: "/marks/yokai/ghost.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-flame", name: "요괴불", imageUrl: "/marks/yokai/flame.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-skull", name: "해골 요괴", imageUrl: "/marks/yokai/skull.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-eye", name: "눈알 요괴", imageUrl: "/marks/yokai/eye.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-gourd", name: "호리병", imageUrl: "/marks/yokai/gourd.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-fox-maple", name: "여우 요괴", imageUrl: "/marks/yokai/fox-maple.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-tengu-elder", name: "텐구", imageUrl: "/marks/yokai/tengu-elder.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-lantern", name: "등불 요괴", imageUrl: "/marks/yokai/lantern.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-kappa", name: "카파", imageUrl: "/marks/yokai/kappa.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-jibakurei", name: "지박령", imageUrl: "/marks/yokai/jibakurei.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-jorogumo", name: "죠로그모", imageUrl: "/marks/yokai/jorogumo.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-demon", name: "악마 요괴", imageUrl: "/marks/yokai/demon.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-hydra", name: "삼두사", imageUrl: "/marks/yokai/hydra.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-cyclops", name: "외눈 도깨비", imageUrl: "/marks/yokai/cyclops.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "yokai-biwa", name: "거문고 유령", imageUrl: "/marks/yokai/biwa.png", pricePoints: REGULAR_MARK_PRICE },
];

/** 상점 고급 마크. 일률 5,000P. */
export const KOREAN_LEGEND_MARKS: YokaiMarkDef[] = [
  { slug: "yokai-gangcheoli", name: "강철이", imageUrl: "/marks/yokai/gangcheoli.png", pricePoints: LEGEND_MARK_PRICE },
  { slug: "yokai-dueoksin", name: "두억시니", imageUrl: "/marks/yokai/dueoksin.png", pricePoints: LEGEND_MARK_PRICE },
  { slug: "yokai-eoduksini", name: "어둑시니", imageUrl: "/marks/yokai/eoduksini.png", pricePoints: LEGEND_MARK_PRICE },
  { slug: "yokai-bulgasari", name: "불가사리", imageUrl: "/marks/yokai/bulgasari.png", pricePoints: LEGEND_MARK_PRICE },
  { slug: "yokai-samdugumi", name: "삼두구미", imageUrl: "/marks/yokai/samdugumi.png", pricePoints: LEGEND_MARK_PRICE },
];

/** 요괴 마을 일반 요괴 메달(은테). 일률 3,000P. */
export const VILLAGE_COMMON_MARKS: YokaiMarkDef[] = [
  { slug: "village-nudeogi", name: "누덕이", imageUrl: "/marks/yokai/village-nudeogi.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-samagwi", name: "사마귀", imageUrl: "/marks/yokai/village-samagwi.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-eodukssini", name: "어둑시니", imageUrl: "/marks/yokai/village-eodukssini.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-noejeongwi", name: "뇌전귀", imageUrl: "/marks/yokai/village-noejeongwi.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-bulgasari", name: "불가사리", imageUrl: "/marks/yokai/village-bulgasari.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-hwaryong", name: "화룡", imageUrl: "/marks/yokai/village-hwaryong.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-bakjwigwi", name: "박쥐귀", imageUrl: "/marks/yokai/village-bakjwigwi.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-deungbulgwi", name: "등불귀", imageUrl: "/marks/yokai/village-deungbulgwi.png", pricePoints: REGULAR_MARK_PRICE },
];

/** 요괴 마을 희귀 요괴 메달(금테). 일률 3,000P. */
export const VILLAGE_RARE_MARKS: YokaiMarkDef[] = [
  { slug: "village-keunnuni", name: "큰눈이", imageUrl: "/marks/yokai/village-keunnuni.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-seolnyeo", name: "설녀", imageUrl: "/marks/yokai/village-seolnyeo.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-tamrang", name: "탐랑", imageUrl: "/marks/yokai/village-tamrang.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-yacha", name: "야차", imageUrl: "/marks/yokai/village-yacha.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-gangcheori", name: "강철이", imageUrl: "/marks/yokai/village-gangcheori.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-dueoksini", name: "두억시니", imageUrl: "/marks/yokai/village-dueoksini.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-sinroksu", name: "신록수", imageUrl: "/marks/yokai/village-sinroksu.png", pricePoints: REGULAR_MARK_PRICE },
  { slug: "village-horibyeonggwi", name: "호리병귀", imageUrl: "/marks/yokai/village-horibyeonggwi.png", pricePoints: REGULAR_MARK_PRICE },
];

/**
 * 팀·브랜드 로고 마크. 일률 3,000P.
 * 예전 팀 마크(team-a~f)와 같은 행을 써서 이미 가진 회원은 그대로 보유합니다.
 */
export const LOGO_MARKS: YokaiMarkDef[] = TEAM_MARK_FILES.map((team) => ({
  slug: team.slug,
  name: team.name,
  imageUrl: team.imageUrl,
  pricePoints: REGULAR_MARK_PRICE,
}));

const YOKAI_SLUGS = new Set(YOKAI_MARKS.map((mark) => mark.slug));
const LEGEND_SLUGS = new Set(KOREAN_LEGEND_MARKS.map((mark) => mark.slug));
const LOGO_SLUGS = new Set(LOGO_MARKS.map((mark) => mark.slug));
const VILLAGE_SLUGS = new Set([...VILLAGE_COMMON_MARKS, ...VILLAGE_RARE_MARKS].map((mark) => mark.slug));

export function isVillageSlug(slug: string) {
  return VILLAGE_SLUGS.has(slug);
}

export function isYokaiSlug(slug: string) {
  return YOKAI_SLUGS.has(slug);
}

export function isLegendSlug(slug: string) {
  return LEGEND_SLUGS.has(slug);
}

export function isLogoSlug(slug: string) {
  return LOGO_SLUGS.has(slug);
}

export function isShopMarkSlug(slug: string) {
  return isYokaiSlug(slug) || isLegendSlug(slug) || isLogoSlug(slug) || isVillageSlug(slug);
}

export const SHOP_MARKS = [...LOGO_MARKS, ...YOKAI_MARKS, ...VILLAGE_COMMON_MARKS, ...VILLAGE_RARE_MARKS, ...KOREAN_LEGEND_MARKS];
