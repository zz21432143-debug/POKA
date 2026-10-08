import { prisma } from "@/lib/db";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/kakao";
import { ttlCache, ttlCacheClear } from "@/lib/ttl-cache";

export const SITE_SETTING_ID = "default";
export const SITE_SETTINGS_CACHE_KEY = "site-settings";

export type PublicSiteSettings = {
  noticeBanner: string | null;
  footerEmail: string;
  kakaoChannelUrl: string | null;
};

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  noticeBanner: null,
  footerEmail: "POKA4444444@gmail.com",
  kakaoChannelUrl: KAKAO_OPEN_CHAT_URL,
};

export async function getSiteSettings(): Promise<PublicSiteSettings> {
  return ttlCache(SITE_SETTINGS_CACHE_KEY, 15_000, async () => {
    const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
    if (!row) return DEFAULT_SITE_SETTINGS;
    return {
      noticeBanner: row.noticeBanner?.trim() || null,
      footerEmail: row.footerEmail.trim() || DEFAULT_SITE_SETTINGS.footerEmail,
      kakaoChannelUrl: row.kakaoChannelUrl?.trim() || null,
    };
  });
}

export function clearSiteSettingsCache() {
  ttlCacheClear(SITE_SETTINGS_CACHE_KEY);
}

export async function ensureSiteSettingsRow() {
  await prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    create: {
      id: SITE_SETTING_ID,
      footerEmail: DEFAULT_SITE_SETTINGS.footerEmail,
      kakaoChannelUrl: DEFAULT_SITE_SETTINGS.kakaoChannelUrl,
    },
    update: {},
  });
}

export const DEFAULT_FORBIDDEN_WORDS = ["텔레그램", "첫충", "꽁머니"];

export async function ensureDefaultForbiddenWords() {
  await prisma.forbiddenWord.createMany({
    data: DEFAULT_FORBIDDEN_WORDS.map((word) => ({ word })),
    skipDuplicates: true,
  });
}
