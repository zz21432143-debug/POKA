import { unstable_cache } from "next/cache";
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
  /** 관리자가 끈 광고 구좌 */
  adsOff: string[];
  /** 관리자 화면에서 넣은 광고 단위 ID */
  adsSlots: Record<string, string>;
};

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  noticeBanner: null,
  footerEmail: publicContactEmail(),
  kakaoChannelUrl: KAKAO_INQUIRY_URL,
  adsOff: [],
  adsSlots: {},
};

export function parseAdsSlots(json: string | null | undefined): Record<string, string> {
  try {
    const v = json ? (JSON.parse(json) as unknown) : {};
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, id] of Object.entries(v as Record<string, unknown>)) {
      if (/^[a-z0-9-]{1,24}$/.test(k) && typeof id === "string" && /^\d{6,20}$/.test(id)) out[k] = id;
    }
    return out;
  } catch {
    return {};
  }
}

export function parseAdsOff(json: string | null | undefined): string[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  } catch {
    return [];
  }
}

async function loadSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: SITE_SETTING_ID } });
    if (!row) return DEFAULT_SITE_SETTINGS;
    return {
      noticeBanner: row.noticeBanner?.trim() || null,
      footerEmail: publicContactEmail(row.footerEmail),
      kakaoChannelUrl: kakaoInquiryHref(row.kakaoChannelUrl),
      adsOff: parseAdsOff(row.adsOffJson),
      adsSlots: parseAdsSlots(row.adsSlotsJson),
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

const cachedSiteSettings = unstable_cache(loadSiteSettings, ["poka-site-settings"], { revalidate: 60, tags: ["site-settings"] });

export async function getSiteSettings(): Promise<PublicSiteSettings> {
  return ttlCache(SITE_SETTINGS_CACHE_KEY, 20_000, () => cachedSiteSettings());
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
