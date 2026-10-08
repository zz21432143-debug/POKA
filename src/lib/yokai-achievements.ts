export type YokaiAchievement = {
  slug: string;
  name: string;
  /** 업적 이름. 카드와 도감에 그대로 보여 줍니다. */
  achievement: string;
  imageUrl: string;
  required: number;
  aura: "aura-yama" | "aura-gumiho";
};

/** 상점 비매품. 일반 요괴 마크 수집 수로만 해금합니다. */
export const YOKAI_ACHIEVEMENTS: YokaiAchievement[] = [
  {
    slug: "yokai-yama",
    name: "염라대왕",
    achievement: "지옥의 지배자",
    imageUrl: "/marks/yokai/yama.png",
    required: 5,
    aura: "aura-yama",
  },
  {
    slug: "yokai-gumiho",
    name: "구미호",
    achievement: "백귀야행의 지배자",
    imageUrl: "/marks/yokai/gumiho.png",
    required: 10,
    aura: "aura-gumiho",
  },
];

const ACHIEVEMENT_SLUGS = new Set(YOKAI_ACHIEVEMENTS.map((mark) => mark.slug));

export function isAchievementSlug(slug: string) {
  return ACHIEVEMENT_SLUGS.has(slug);
}

export function achievementBySlug(slug: string) {
  return YOKAI_ACHIEVEMENTS.find((mark) => mark.slug === slug) ?? null;
}

export function auraClassForSrc(src: string | null | undefined) {
  if (!src) return "";
  if (src.includes("/yama.png")) return "aura-yama";
  if (src.includes("/gumiho.png")) return "aura-gumiho";
  return "";
}
