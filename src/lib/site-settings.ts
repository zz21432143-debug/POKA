import { prisma } from "@/lib/db";
import { KAKAO_INQUIRY_URL, kakaoInquiryHref } from "@/lib/kakao";
import { publicContactEmail } from "@/lib/legal-contact";
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
  footerEmail: publicContactEmail(),
  kakaoChannelUrl: KAKAO_INQUIRY_URL,
};

export async function getSiteSettings(): Promise<PublicSiteSettings> {
  return ttlCache(SITE_SETTINGS_CACHE_KEY, 15_000, async () => {
    const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
    if (!row) return DEFAULT_SITE_SETTINGS;
    return {
      noticeBanner: row.noticeBanner?.trim() || null,
      footerEmail: publicContactEmail(row.footerEmail),
      kakaoChannelUrl: kakaoInquiryHref(row.kakaoChannelUrl),
    };
  });
}

export function clearSiteSettingsCache() {
  ttlCacheClear(SITE_SETTINGS_CACHE_KEY);
}

export async function ensureSiteSettingsRow() {
  const existing = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
  if (!existing) {
    await prisma.siteSetting.create({
      data: {
        id: SITE_SETTING_ID,
        footerEmail: DEFAULT_SITE_SETTINGS.footerEmail,
        kakaoChannelUrl: DEFAULT_SITE_SETTINGS.kakaoChannelUrl,
      },
    });
    return;
  }
  const footerEmail = publicContactEmail(existing.footerEmail);
  const kakaoChannelUrl = kakaoInquiryHref(existing.kakaoChannelUrl);
  if (footerEmail !== existing.footerEmail || kakaoChannelUrl !== (existing.kakaoChannelUrl ?? "")) {
    await prisma.siteSetting.update({
      where: { id: SITE_SETTING_ID },
      data: { footerEmail, kakaoChannelUrl },
    });
  }
}

export const DEFAULT_FORBIDDEN_WORDS = ["텔레그램", "첫충", "꽁머니"];

export async function ensureDefaultForbiddenWords() {
  await prisma.forbiddenWord.createMany({
    data: DEFAULT_FORBIDDEN_WORDS.map((word) => ({ word })),
    skipDuplicates: true,
  });
}
