import { prisma } from "@/lib/db";
import { PREMIUM_BANNERS, type PromoBanner } from "@/lib/banners";
import { normalizeMark } from "@/lib/inventory-policy";

export type PremiumBannerCard = PromoBanner & {
  mode: string;
  enabled: boolean;
  vacant: boolean;
  location?: string | null;
  tag?: string | null;
  isPaid?: boolean;
  mark: "AD" | "제휴";
};

export async function ensureBannerSlots() {
  const existing = await prisma.bannerSlot.findMany();
  const have = new Set(existing.map((row) => row.slot));
  const missing = [1, 2, 3, 4, 5, 6].filter((slot) => !have.has(slot));
  if (missing.length) {
    await prisma.bannerSlot.createMany({
      data: missing.map((slot) => ({ slot, mode: "AUTO", enabled: true })),
    });
  }
}

export async function getPremiumBanners(): Promise<PremiumBannerCard[]> {
  try {
    await ensureBannerSlots();
    const [slots, promoPosts] = await Promise.all([
      prisma.bannerSlot.findMany({
        orderBy: { slot: "asc" },
        include: { post: true },
      }),
      prisma.post.findMany({
        where: { boardType: "PROMO", hidden: false, storeVerified: true },
        orderBy: [{ isPaid: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const used = new Set<string>();
    const autoPool = [...promoPosts];

    return PREMIUM_BANNERS.map((fallback) => {
      const slot = slots.find((row) => row.slot === fallback.id);
      if (!slot || !slot.enabled) {
        return {
          ...fallback,
          href: "/advertise",
          title: "제휴 / 광고 문의하기",
          sponsor: `구좌 ${fallback.id}`,
          mode: slot?.mode ?? "AUTO",
          enabled: false,
          vacant: true,
          mark: "제휴" as const,
        };
      }

      if (slot.mode === "MANUAL" && slot.post && !slot.post.hidden && slot.post.bannerImageUrl) {
        used.add(slot.post.id);
        return {
          id: fallback.id,
          href: `/posts/${slot.post.id}`,
          title: slot.post.title,
          sponsor: `구좌 ${fallback.id}`,
          image: slot.post.bannerImageUrl,
          mode: "MANUAL",
          enabled: true,
          vacant: false,
          location: slot.post.promoLocation,
          tag: slot.post.promoTag,
          isPaid: slot.post.isPaid,
          mark: normalizeMark(slot.post.promoTag, slot.post.isPaid),
        };
      }

      const auto = autoPool.find((post) => !used.has(post.id) && post.bannerImageUrl);
      if (auto?.bannerImageUrl) {
        used.add(auto.id);
        return {
          id: fallback.id,
          href: `/posts/${auto.id}`,
          title: auto.title,
          sponsor: `구좌 ${fallback.id}`,
          image: auto.bannerImageUrl,
          mode: "AUTO",
          enabled: true,
          vacant: false,
          location: auto.promoLocation,
          tag: auto.promoTag,
          isPaid: auto.isPaid,
          mark: normalizeMark(auto.promoTag, auto.isPaid),
        };
      }

      return {
        ...fallback,
        href: "/advertise",
        title: "제휴 / 광고 문의하기",
        sponsor: `구좌 ${fallback.id}`,
        mode: "AUTO",
        enabled: true,
        vacant: true,
        mark: "제휴" as const,
      };
    });
  } catch {
    return PREMIUM_BANNERS.map((banner) => ({
      ...banner,
      href: "/advertise",
      title: "제휴 / 광고 문의하기",
      image: "",
      mode: "AUTO",
      enabled: true,
      vacant: true,
      mark: "제휴" as const,
    }));
  }
}
