export type YokaiAchievement = {
  slug: string;
  name: string;
  imageUrl: string;
  minLevel: number;
  aura: "aura-yama" | "aura-gumiho";
};

/** 레벨 달성 시 자동 지급. 상점에서 살 수 없습니다. */
export const YOKAI_ACHIEVEMENTS: YokaiAchievement[] = [
  {
    slug: "yokai-gumiho",
    name: "구미호",
    imageUrl: "/marks/yokai/gumiho.png",
    minLevel: 200,
    aura: "aura-gumiho",
  },
  {
    slug: "yokai-yama",
    name: "염라대왕",
    imageUrl: "/marks/yokai/yama.png",
    minLevel: 250,
    aura: "aura-yama",
  },
];

const ACHIEVEMENT_SLUGS = new Set(YOKAI_ACHIEVEMENTS.map((mark) => mark.slug));

export function isAchievementSlug(slug: string) {
  return ACHIEVEMENT_SLUGS.has(slug);
}

export function achievementBySlug(slug: string) {
  return YOKAI_ACHIEVEMENTS.find((mark) => mark.slug === slug) ?? null;
}

export function levelRewardSlugs(level: number) {
  return YOKAI_ACHIEVEMENTS.filter((mark) => level >= mark.minLevel).map((mark) => mark.slug);
}

export function auraClassForSrc(src: string | null | undefined) {
  if (!src) return "";
  if (src.includes("/yama.png")) return "aura-yama";
  if (src.includes("/gumiho.png")) return "aura-gumiho";
  return "";
}
